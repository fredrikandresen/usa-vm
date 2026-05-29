const DEFAULT_BASE_URL = process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4';

function normalizeStage(stage) {
  const normalized = String(stage || '').toUpperCase();
  if (normalized.includes('GROUP')) return 'group';
  if (normalized.includes('LAST_16') || normalized.includes('ROUND_OF_16')) return 'round_of_16';
  if (normalized.includes('QUARTER')) return 'quarterfinal';
  if (normalized.includes('SEMI')) return 'semifinal';
  if (normalized.includes('THIRD')) return 'third_place';
  if (normalized.includes('FINAL')) return 'final';
  return String(stage || 'group').toLowerCase();
}

export async function fetchMatchResults({ apiKey, baseUrl = DEFAULT_BASE_URL, competition = 'WC' } = {}) {
  if (!apiKey) throw new Error('football-data API key is required');

  const response = await fetch(`${baseUrl}/competitions/${competition}/matches?status=FINISHED`, {
    headers: {
      'X-Auth-Token': apiKey,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`football-data request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return (payload.matches || []).map((match) => ({
    id: match.id ? String(match.id) : null,
    kickoffAt: match.utcDate || null,
    status: match.status === 'FINISHED' ? 'finished' : String(match.status || 'scheduled').toLowerCase(),
    stage: normalizeStage(match.stage),
    group: match.group || null,
    homeTeam: match.homeTeam?.name || null,
    awayTeam: match.awayTeam?.name || null,
    homeScore: Number.isFinite(match.score?.fullTime?.home) ? match.score.fullTime.home : null,
    awayScore: Number.isFinite(match.score?.fullTime?.away) ? match.score.fullTime.away : null,
    goals: (match.goals || []).map((goal) => ({
      scorer: goal.scorer?.name || null,
      assist: goal.assist?.name || null
    }))
  }));
}
