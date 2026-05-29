import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  addGroupPrediction,
  addMatchPrediction,
  db,
  leaderboard,
  listMatches,
  rerunScoring,
  signup,
  syncMatchResults
} from '../lib/store.js';
import {
  createMagicLinkToken,
  verifyMagicLinkToken,
  createSessionToken,
  storeSession,
  getSession,
  sendMagicLinkEmail
} from '../lib/auth.js';
import { fetchMatchResults } from '../lib/football-data.js';
import { defaultLanguage, getTranslations } from '../lib/i18n.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

app.use(express.json());
app.use(express.static(publicDir));

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

function rateLimit(req, res, next) {
  const key = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { windowStart: now, count: 1 });
    return next();
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  entry.count += 1;
  return next();
}

function getAuthenticatedUser(req) {
  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = getSession(token);
    if (session) return db.users.find((user) => user.id === session.userId) || null;
  }

  const adminId = req.header('x-admin-user-id');
  if (adminId) return db.users.find((user) => user.id === adminId) || null;

  return null;
}

function mustBeAuthenticated(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  req.user = user;
  req.userId = user.id;
  return next();
}

function mustBeAdmin(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin access required' });
  req.user = user;
  req.userId = user.id;
  return next();
}

app.get('/', rateLimit, (_req, res) => res.redirect('/index.html'));
app.get('/app', rateLimit, (_req, res) => res.redirect('/app.html'));

app.get('/api/companies', (_req, res) => res.json(db.companies));
app.get('/api/matches', (_req, res) => res.json(listMatches()));
app.get('/api/i18n/:lang', (req, res) => res.json(getTranslations(req.params.lang || defaultLanguage)));

app.post('/api/auth/login', rateLimit, (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  const user = db.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found. Please sign up first.' });

  const token = createMagicLinkToken(email);
  const magicLinkUrl = `${BASE_URL}/app.html?magic_token=${token}`;
  sendMagicLinkEmail(email, magicLinkUrl);

  return res.json({
    message: 'Magic link sent to your email',
    magic_link_url: magicLinkUrl
  });
});

app.get('/api/auth/verify', rateLimit, (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const email = verifyMagicLinkToken(token);
  if (!email) return res.status(401).json({ error: 'Invalid or expired magic link' });

  const user = db.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });

  const sessionToken = createSessionToken();
  storeSession(sessionToken, user.id);

  return res.json({ session_token: sessionToken, user });
});

app.post('/api/signup', (req, res) => {
  const { email, name, company } = req.body || {};
  if (!email || !name || !company) return res.status(400).json({ error: 'email, name and company are required' });

  const existing = db.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'User already exists' });
  if (!db.companies.find((entry) => entry.id === company)) return res.status(400).json({ error: 'Unknown company' });

  const user = signup({ email, name, company });
  const token = createMagicLinkToken(email);
  const magicLinkUrl = `${BASE_URL}/app.html?magic_token=${token}`;
  sendMagicLinkEmail(email, magicLinkUrl);

  return res.status(201).json({
    user,
    message: 'Magic link sent to your email to complete login',
    magic_link_url: magicLinkUrl
  });
});

app.post('/api/predictions/group', mustBeAuthenticated, (req, res) => {
  const { group, winner_team, runner_up_team } = req.body || {};
  if (!group || !winner_team || !runner_up_team) {
    return res.status(400).json({ error: 'group, winner_team and runner_up_team are required' });
  }

  const firstKickoff = db.matches
    .map((match) => match.kickoff_at)
    .filter(Boolean)
    .sort()[0];
  if (firstKickoff && new Date() >= new Date(firstKickoff)) {
    return res.status(423).json({ error: 'Group predictions are locked after first kickoff' });
  }

  const prediction = addGroupPrediction(req.userId, { group, winner_team, runner_up_team });
  return res.status(201).json(prediction);
});

app.post('/api/predictions/match', mustBeAuthenticated, (req, res) => {
  const { match_id, predicted_home, predicted_away, scorers = [], assists = [] } = req.body || {};
  if (match_id == null || predicted_home == null || predicted_away == null) {
    return res.status(400).json({ error: 'match_id, predicted_home and predicted_away are required' });
  }

  const match = db.matches.find((entry) => entry.id === match_id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (new Date() >= new Date(match.kickoff_at)) return res.status(423).json({ error: 'Prediction locked at kickoff' });

  const prediction = addMatchPrediction(req.userId, {
    match_id,
    predicted_home: Number(predicted_home),
    predicted_away: Number(predicted_away),
    scorers: scorers.slice(0, 4),
    assists: assists.slice(0, 2)
  });

  return res.status(201).json(prediction);
});

app.get('/api/leaderboard', (req, res) => {
  const company = req.query.company || null;
  const stage = req.query.stage || null;
  return res.json(leaderboard(company, stage));
});

app.get('/api/dashboard/:userId', mustBeAuthenticated, (req, res) => {
  const userId = req.params.userId;
  const user = db.users.find((entry) => entry.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (req.userId !== userId && !req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });

  const all = leaderboard();
  const rank = all.findIndex((entry) => entry.user_id === userId) + 1;

  return res.json({
    user,
    rank: rank || null,
    points: all.find((entry) => entry.user_id === userId)?.points || 0,
    predictions: db.predictions.filter((prediction) => prediction.user_id === userId),
    group_predictions: db.groupPredictions.filter((prediction) => prediction.user_id === userId)
  });
});

app.get('/api/admin/users', mustBeAdmin, (_req, res) => {
  return res.json(
    db.users.map((user) => ({
      ...user,
      prediction_count: db.predictions.filter((prediction) => prediction.user_id === user.id).length,
      group_prediction_count: db.groupPredictions.filter((prediction) => prediction.user_id === user.id).length
    }))
  );
});

app.post('/api/admin/settings/football-data-key', mustBeAdmin, (req, res) => {
  const { apiKey } = req.body || {};
  if (!apiKey) return res.status(400).json({ error: 'apiKey is required' });
  db.settings.footballDataApiKey = apiKey;
  return res.status(200).json({ ok: true });
});

app.post('/api/admin/scoring/rerun', mustBeAdmin, (_req, res) => {
  const result = rerunScoring();
  return res.status(200).json({ scoredRows: result.length });
});

app.post('/api/admin/sync-results', mustBeAdmin, async (req, res) => {
  try {
    const apiKey = req.body?.apiKey || db.settings.footballDataApiKey;
    if (!apiKey) return res.status(400).json({ error: 'football-data API key is required' });
    if (req.body?.apiKey) db.settings.footballDataApiKey = req.body.apiKey;

    const results = await fetchMatchResults({ apiKey });
    const updatedMatches = syncMatchResults(results);
    const scoredRows = rerunScoring().length;

    return res.status(200).json({ fetched: results.length, updatedMatches, scoredRows });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Unable to sync results' });
  }
});

app.post('/api/admin/manual-override', mustBeAdmin, (req, res) => {
  const { match_id, home_score, away_score, status = 'finished' } = req.body || {};
  const match = db.matches.find((entry) => entry.id === match_id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  match.home_score = home_score;
  match.away_score = away_score;
  match.status = status;

  return res.status(200).json(match);
});

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Nova VM 2026 API running on port ${port}`);
  });
}

export default app;
