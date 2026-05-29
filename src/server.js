import express from 'express';
import {
  addGroupPrediction,
  addMatchPrediction,
  db,
  leaderboard,
  rerunScoring,
  signup
} from '../lib/store.js';

const app = express();
app.use(express.json());

function mustBeAdmin(req, res, next) {
  const adminId = req.header('x-admin-user-id');
  const user = db.users.find((u) => u.id === adminId);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin access required' });
  return next();
}

app.get('/api/companies', (_req, res) => res.json(db.companies));

app.post('/api/signup', (req, res) => {
  const { email, name, company } = req.body || {};
  if (!email || !name || !company) return res.status(400).json({ error: 'email, name and company are required' });

  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'User already exists' });

  if (!db.companies.find((c) => c.id === company)) return res.status(400).json({ error: 'Unknown company' });

  const user = signup({ email, name, company });
  return res.status(201).json({
    user,
    auth: {
      current: 'supabase_magic_link',
      future: 'microsoft_entra_id'
    }
  });
});

app.post('/api/predictions/group', (req, res) => {
  const { user_id, group, winner_team, runner_up_team } = req.body || {};
  if (!user_id || !group || !winner_team || !runner_up_team) {
    return res.status(400).json({ error: 'user_id, group, winner_team and runner_up_team are required' });
  }

  const firstKickoff = db.matches
    .map((m) => m.kickoff_at)
    .filter(Boolean)
    .sort()[0];
  if (firstKickoff && new Date() >= new Date(firstKickoff)) {
    return res.status(423).json({ error: 'Group predictions are locked after first kickoff' });
  }

  const prediction = addGroupPrediction(user_id, { group, winner_team, runner_up_team });
  return res.status(201).json(prediction);
});

app.post('/api/predictions/match', (req, res) => {
  const { user_id, match_id, predicted_home, predicted_away, scorers = [], assists = [] } = req.body || {};

  const match = db.matches.find((m) => m.id === match_id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (new Date() >= new Date(match.kickoff_at)) return res.status(423).json({ error: 'Prediction locked at kickoff' });

  const cappedScorers = scorers.slice(0, 4);
  const cappedAssists = assists.slice(0, 2);

  const prediction = addMatchPrediction(user_id, {
    match_id,
    predicted_home,
    predicted_away,
    scorers: cappedScorers,
    assists: cappedAssists
  });

  return res.status(201).json(prediction);
});

app.get('/api/leaderboard', (req, res) => {
  const company = req.query.company || null;
  return res.json(leaderboard(company));
});

app.get('/api/dashboard/:userId', (req, res) => {
  const userId = req.params.userId;
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const all = leaderboard();
  const rank = all.findIndex((x) => x.user_id === userId) + 1;

  return res.json({
    user,
    rank: rank || null,
    points: all.find((x) => x.user_id === userId)?.points || 0,
    predictions: db.predictions.filter((p) => p.user_id === userId),
    group_predictions: db.groupPredictions.filter((p) => p.user_id === userId)
  });
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

app.post('/api/admin/manual-override', mustBeAdmin, (req, res) => {
  const { match_id, home_score, away_score, status = 'finished' } = req.body || {};
  const match = db.matches.find((m) => m.id === match_id);
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
