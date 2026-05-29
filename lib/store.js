import { randomUUID } from 'node:crypto';
import { scoreGroupPrediction, scoreMatchPrediction } from './scoring.js';

const companies = [
  { id: 'nova-core', name: 'Nova Core' },
  { id: 'nova-data', name: 'Nova Data' },
  { id: 'nova-finance', name: 'Nova Finance' },
  { id: 'nova-consulting', name: 'Nova Consulting' }
];

const users = [];
const matches = [];
const predictions = [];
const groupPredictions = [];
const scores = [];
const settings = { footballDataApiKey: null };

export const db = { companies, users, matches, predictions, groupPredictions, scores, settings };

export function signup({ email, name, company }) {
  const user = {
    id: randomUUID(),
    email,
    name,
    company,
    is_admin: false,
    created_at: new Date().toISOString(),
    auth_provider: 'supabase_magic_link'
  };
  users.push(user);
  return user;
}

export function addMatchPrediction(userId, prediction) {
  const entry = {
    id: randomUUID(),
    user_id: userId,
    ...prediction,
    locked_at: new Date().toISOString()
  };
  predictions.push(entry);
  return entry;
}

export function addGroupPrediction(userId, prediction) {
  const entry = { id: randomUUID(), user_id: userId, ...prediction };
  groupPredictions.push(entry);
  return entry;
}

export function rerunScoring() {
  scores.length = 0;

  for (const p of predictions) {
    const match = matches.find((m) => m.id === p.match_id && m.status === 'finished');
    if (!match) continue;

    const scorers = (p.scorers || []).slice(0, 4);
    const assists = (p.assists || []).slice(0, 2);
    const result = scoreMatchPrediction(p, match, scorers, assists, match.stage);

    scores.push({
      id: randomUUID(),
      user_id: p.user_id,
      match_id: p.match_id,
      points_awarded: result.points,
      breakdown_json: result.breakdown
    });
  }

  const standingsByGroup = new Map();
  for (const m of matches.filter((match) => match.status === 'finished' && match.group)) {
    if (!standingsByGroup.has(m.group)) standingsByGroup.set(m.group, [m.home_team, m.away_team]);
  }

  for (const gp of groupPredictions) {
    const standings = standingsByGroup.get(gp.group) || [];
    if (standings.length < 2) continue;

    scores.push({
      id: randomUUID(),
      user_id: gp.user_id,
      match_id: null,
      points_awarded: scoreGroupPrediction(gp, standings),
      breakdown_json: { type: 'group_prediction', group: gp.group }
    });
  }

  return scores;
}

export function leaderboard(company = null) {
  const byUser = new Map();

  for (const s of scores) byUser.set(s.user_id, (byUser.get(s.user_id) || 0) + s.points_awarded);

  return users
    .filter((u) => !company || u.company === company)
    .map((u) => ({ user_id: u.id, name: u.name, company: u.company, points: byUser.get(u.id) || 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
