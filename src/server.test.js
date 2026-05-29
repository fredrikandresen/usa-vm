import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { getStageMultiplier, scoreMatchPrediction } from '../lib/scoring.js';
import { createSessionToken, storeSession } from '../lib/auth.js';
import { addMatchPrediction, db, resetStore, rerunScoring, signup } from '../lib/store.js';

process.env.NODE_ENV = 'test';
const { default: app } = await import('./server.js');

let server;
let baseUrl;
const originalFetch = global.fetch;

test.beforeEach(async () => {
  resetStore();
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  global.fetch = originalFetch;
});

test.afterEach(async () => {
  global.fetch = originalFetch;
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

function authHeaders(user) {
  const token = createSessionToken();
  storeSession(token, user.id);
  return { Authorization: `Bearer ${token}` };
}

async function api(path, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.text();
  const isJson = response.headers.get('content-type')?.includes('application/json');
  return {
    status: response.status,
    headers: response.headers,
    json: isJson && payload ? JSON.parse(payload) : null,
    text: payload
  };
}

test('applies stage multipliers correctly', () => {
  assert.equal(getStageMultiplier('group'), 1);
  assert.equal(getStageMultiplier('quarterfinal'), 2);
  assert.equal(getStageMultiplier('semifinal'), 3);
  assert.equal(getStageMultiplier('final'), 4);
});

test('scores exact prediction with scorer and assist', () => {
  const prediction = { predicted_home: 2, predicted_away: 1 };
  const result = {
    home_score: 2,
    away_score: 1,
    match_goals: [
      { scorer: 'Player One', assist: 'Playmaker' },
      { scorer: 'Player Two', assist: null }
    ]
  };

  const scored = scoreMatchPrediction(prediction, result, ['Player One'], ['Playmaker'], 'semifinal');

  assert.equal(scored.points, (3 + 2 + 3 + 2 + 1) * 3);
});

test('serves frontend, matches, and i18n content', async () => {
  const home = await api('/');
  assert.equal(home.status, 200);
  assert.match(home.text, /Nova VM 2026/);

  const matches = await api('/api/matches');
  assert.equal(matches.status, 200);
  assert.equal(matches.json.length, 72);
  assert.equal(matches.json[0].homeTeam.name, 'Mexico');

  const translations = await api('/api/i18n/no');
  assert.equal(translations.status, 200);
  assert.equal(translations.json.language, 'no');
  assert.equal(translations.json.translations.leaderboard, 'Tabell');
});

test('protects prediction and dashboard routes', async () => {
  const user = signup({ email: 'player@example.com', name: 'Player One', company: 'nova-core' });

  const deniedPrediction = await api('/api/predictions/match', {
    method: 'POST',
    body: { match_id: 'A-1', predicted_home: 2, predicted_away: 1 }
  });
  assert.equal(deniedPrediction.status, 401);

  const allowedPrediction = await api('/api/predictions/match', {
    method: 'POST',
    headers: authHeaders(user),
    body: { match_id: 'A-1', predicted_home: 2, predicted_away: 1 }
  });
  assert.equal(allowedPrediction.status, 201);
  assert.equal(allowedPrediction.json.user_id, user.id);

  const deniedDashboard = await api(`/api/dashboard/${user.id}`);
  assert.equal(deniedDashboard.status, 401);

  const dashboard = await api(`/api/dashboard/${user.id}`, {
    headers: authHeaders(user)
  });
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.json.predictions.length, 1);
});

test('admin can list all users', async () => {
  const admin = signup({ email: 'admin@example.com', name: 'Admin', company: 'nova-core' });
  admin.is_admin = true;
  signup({ email: 'user@example.com', name: 'User', company: 'nova-data' });

  const response = await api('/api/admin/users', {
    headers: authHeaders(admin)
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.length, 2);
  assert.equal(response.json[0].prediction_count, 0);
});

test('leaderboard supports stage filtering', async () => {
  const alice = signup({ email: 'alice@example.com', name: 'Alice', company: 'nova-core' });
  const bob = signup({ email: 'bob@example.com', name: 'Bob', company: 'nova-data' });

  addMatchPrediction(alice.id, { match_id: 'A-1', predicted_home: 2, predicted_away: 1, scorers: [], assists: [] });
  addMatchPrediction(bob.id, { match_id: 'final-1', predicted_home: 1, predicted_away: 0, scorers: [], assists: [] });

  const groupMatch = db.matches.find((match) => match.id === 'A-1');
  groupMatch.status = 'finished';
  groupMatch.home_score = 2;
  groupMatch.away_score = 1;

  db.matches.push({
    id: 'final-1',
    home_team: 'B1',
    away_team: 'B2',
    kickoff_at: '2026-07-19T18:00:00Z',
    group: null,
    group_name: null,
    stage: 'final',
    status: 'finished',
    home_score: 1,
    away_score: 0,
    match_goals: []
  });

  rerunScoring();

  const groupBoard = await api('/api/leaderboard?stage=group');
  assert.equal(groupBoard.status, 200);
  assert.equal(groupBoard.json[0].name, 'Alice');
  assert.equal(groupBoard.json[0].points, 8);

  const finalBoard = await api('/api/leaderboard?stage=final');
  assert.equal(finalBoard.status, 200);
  assert.equal(finalBoard.json[0].name, 'Bob');
  assert.equal(finalBoard.json[0].points, 32);
});

test('admin sync-results imports scores and reruns scoring', async () => {
  const admin = signup({ email: 'admin2@example.com', name: 'Admin Two', company: 'nova-core' });
  admin.is_admin = true;
  const player = signup({ email: 'player2@example.com', name: 'Player Two', company: 'nova-core' });

  addMatchPrediction(player.id, { match_id: 'A-1', predicted_home: 2, predicted_away: 1, scorers: [], assists: [] });

  global.fetch = async (url, options) => {
    if (String(url).startsWith(baseUrl)) {
      return originalFetch(url, options);
    }

    assert.equal(options.headers['X-Auth-Token'], 'demo-key');
    return new Response(
      JSON.stringify({
        matches: [
          {
            id: 'A-1',
            utcDate: '2026-06-11T18:00:00Z',
            status: 'FINISHED',
            stage: 'GROUP_STAGE',
            group: 'Group A',
            homeTeam: { name: 'Mexico' },
            awayTeam: { name: 'Canada' },
            score: { fullTime: { home: 2, away: 1 } },
            goals: []
          }
        ]
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  };

  const response = await api('/api/admin/sync-results', {
    method: 'POST',
    headers: authHeaders(admin),
    body: { apiKey: 'demo-key' }
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.fetched, 1);
  assert.equal(response.json.updatedMatches, 1);
  assert.equal(response.json.scoredRows, 1);
  assert.equal(db.matches.find((match) => match.id === 'A-1').status, 'finished');

  const board = await api('/api/leaderboard?stage=group');
  assert.equal(board.json[0].name, 'Player Two');
  assert.equal(board.json[0].points, 8);
});
