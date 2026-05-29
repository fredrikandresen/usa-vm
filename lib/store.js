import { randomUUID } from 'node:crypto';
import { scoreGroupPrediction, scoreMatchPrediction } from './scoring.js';
import { matches as seededMatches, teams as seededTeams } from './tournament-data.js';

const companies = [
  { id: 'nova-core', name: 'Nova Core' },
  { id: 'nova-data', name: 'Nova Data' },
  { id: 'nova-finance', name: 'Nova Finance' },
  { id: 'nova-consulting', name: 'Nova Consulting' }
];

const users = [];
const teams = seededTeams.map((team) => ({ ...team }));
const matches = seededMatches.map((match) => ({ ...match, match_goals: [...match.match_goals] }));
const predictions = [];
const groupPredictions = [];
const scores = [];
const settings = { footballDataApiKey: null };

export const db = { companies, users, teams, matches, predictions, groupPredictions, scores, settings };

function normalizeText(value = '') {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cloneMatch(match) {
  return {
    ...match,
    match_goals: Array.isArray(match.match_goals) ? match.match_goals.map((goal) => ({ ...goal })) : []
  };
}

function resetArray(target, values) {
  target.length = 0;
  target.push(...values);
}

function getTeamMap() {
  return new Map(teams.map((team) => [team.id, team]));
}

function buildGroupStandings(group) {
  const groupTeams = teams.filter((team) => team.group === group);
  const finishedMatches = matches.filter((match) => match.group === group && match.status === 'finished');
  if (groupTeams.length === 0 || finishedMatches.length < 6) return null;

  const table = new Map(
    groupTeams.map((team) => [team.id, { teamId: team.id, points: 0, goalDifference: 0, goalsFor: 0 }])
  );

  for (const match of finishedMatches) {
    const home = table.get(match.home_team);
    const away = table.get(match.away_team);
    if (!home || !away) continue;

    const homeScore = Number(match.home_score ?? 0);
    const awayScore = Number(match.away_score ?? 0);

    home.goalsFor += homeScore;
    away.goalsFor += awayScore;
    home.goalDifference += homeScore - awayScore;
    away.goalDifference += awayScore - homeScore;

    if (homeScore > awayScore) {
      home.points += 3;
    } else if (awayScore > homeScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  return [...table.values()]
    .sort((a, b) => {
      const teamA = teams.find((team) => team.id === a.teamId)?.name || a.teamId;
      const teamB = teams.find((team) => team.id === b.teamId)?.name || b.teamId;
      return (
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        teamA.localeCompare(teamB)
      );
    })
    .map((entry) => entry.teamId);
}

function findTeamIdByName(name) {
  const normalized = normalizeText(name);
  return teams.find((team) => normalizeText(team.name) === normalized)?.id || null;
}

function findMatchForResult(result) {
  if (result.id) {
    const directMatch = matches.find((match) => match.id === String(result.id));
    if (directMatch) return directMatch;
  }

  const homeTeamId = result.homeTeamId || findTeamIdByName(result.homeTeam);
  const awayTeamId = result.awayTeamId || findTeamIdByName(result.awayTeam);
  if (!homeTeamId || !awayTeamId) return null;

  let candidates = matches.filter((match) => match.home_team === homeTeamId && match.away_team === awayTeamId);
  if (result.stage) {
    const stage = normalizeText(result.stage);
    candidates = candidates.filter((match) => normalizeText(match.stage) === stage);
  }
  if (result.group) {
    const group = normalizeText(result.group);
    candidates = candidates.filter(
      (match) => normalizeText(match.group) === group || normalizeText(match.group_name) === group
    );
  }
  if (candidates.length === 1) return candidates[0];
  if (result.kickoffAt && candidates.length > 1) {
    const target = new Date(result.kickoffAt).getTime();
    return candidates
      .slice()
      .sort(
        (a, b) =>
          Math.abs(new Date(a.kickoff_at).getTime() - target) - Math.abs(new Date(b.kickoff_at).getTime() - target)
      )[0];
  }
  return candidates[0] || null;
}

export function resetStore() {
  users.length = 0;
  predictions.length = 0;
  groupPredictions.length = 0;
  scores.length = 0;
  settings.footballDataApiKey = null;
  resetArray(teams, seededTeams.map((team) => ({ ...team })));
  resetArray(matches, seededMatches.map((match) => cloneMatch(match)));
}

export function signup({ email, name, company }) {
  const user = {
    id: randomUUID(),
    email,
    name,
    company,
    is_admin: false,
    created_at: new Date().toISOString(),
    auth_provider: 'magic_link'
  };
  users.push(user);
  return user;
}

export function addMatchPrediction(userId, prediction) {
  const existingIndex = predictions.findIndex((entry) => entry.user_id === userId && entry.match_id === prediction.match_id);
  const entry = {
    id: existingIndex >= 0 ? predictions[existingIndex].id : randomUUID(),
    user_id: userId,
    ...prediction,
    locked_at: new Date().toISOString()
  };

  if (existingIndex >= 0) predictions[existingIndex] = entry;
  else predictions.push(entry);

  return entry;
}

export function addGroupPrediction(userId, prediction) {
  const existingIndex = groupPredictions.findIndex(
    (entry) => entry.user_id === userId && entry.group === prediction.group
  );
  const entry = {
    id: existingIndex >= 0 ? groupPredictions[existingIndex].id : randomUUID(),
    user_id: userId,
    ...prediction
  };

  if (existingIndex >= 0) groupPredictions[existingIndex] = entry;
  else groupPredictions.push(entry);

  return entry;
}

export function rerunScoring() {
  scores.length = 0;

  for (const prediction of predictions) {
    const match = matches.find((entry) => entry.id === prediction.match_id && entry.status === 'finished');
    if (!match) continue;

    const scorers = (prediction.scorers || []).slice(0, 4);
    const assists = (prediction.assists || []).slice(0, 2);
    const result = scoreMatchPrediction(prediction, match, scorers, assists, match.stage);

    scores.push({
      id: randomUUID(),
      user_id: prediction.user_id,
      match_id: prediction.match_id,
      points_awarded: result.points,
      breakdown_json: {
        ...result.breakdown,
        type: 'match_prediction',
        stage: match.stage
      }
    });
  }

  for (const prediction of groupPredictions) {
    const standings = buildGroupStandings(prediction.group);
    if (!standings) continue;

    scores.push({
      id: randomUUID(),
      user_id: prediction.user_id,
      match_id: null,
      points_awarded: scoreGroupPrediction(prediction, standings),
      breakdown_json: {
        type: 'group_prediction',
        group: prediction.group,
        stage: 'group'
      }
    });
  }

  return scores;
}

export function leaderboard(company = null, stage = null) {
  const byUser = new Map();
  const normalizedStage = stage && stage !== 'all' ? normalizeText(stage) : null;

  for (const score of scores) {
    if (normalizedStage && normalizeText(score.breakdown_json?.stage || '') !== normalizedStage) continue;
    byUser.set(score.user_id, (byUser.get(score.user_id) || 0) + score.points_awarded);
  }

  return users
    .filter((user) => !company || user.company === company)
    .map((user) => ({ user_id: user.id, name: user.name, company: user.company, points: byUser.get(user.id) || 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

export function listMatches() {
  const teamMap = getTeamMap();

  return matches
    .slice()
    .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))
    .map((match) => ({
      ...cloneMatch(match),
      homeTeam: teamMap.get(match.home_team) || null,
      awayTeam: teamMap.get(match.away_team) || null
    }));
}

export function syncMatchResults(results = []) {
  let updatedMatches = 0;

  for (const result of results) {
    const match = findMatchForResult(result);
    if (!match) continue;

    match.home_score = Number.isFinite(result.homeScore) ? result.homeScore : match.home_score;
    match.away_score = Number.isFinite(result.awayScore) ? result.awayScore : match.away_score;
    match.status = result.status || 'finished';
    if (result.kickoffAt) match.kickoff_at = result.kickoffAt;
    if (Array.isArray(result.goals)) match.match_goals = result.goals.map((goal) => ({ ...goal }));
    updatedMatches += 1;
  }

  return updatedMatches;
}
