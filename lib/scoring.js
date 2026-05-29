export function getStageMultiplier(stage) {
  const normalized = (stage || '').toLowerCase();
  if (normalized === 'quarterfinal') return 2;
  if (normalized === 'semifinal') return 3;
  if (normalized === 'final') return 4;
  return 1;
}

export function scoreMatchPrediction(prediction, result, scorers = [], assists = [], stage = 'group') {
  let points = 0;
  const breakdown = {
    outcome: 0,
    goalDifference: 0,
    exactScore: 0,
    scorers: 0,
    assists: 0,
    multiplier: getStageMultiplier(stage)
  };

  const predictedDiff = prediction.predicted_home - prediction.predicted_away;
  const actualDiff = result.home_score - result.away_score;

  const predictedOutcome = predictedDiff === 0 ? 'D' : predictedDiff > 0 ? 'W' : 'L';
  const actualOutcome = actualDiff === 0 ? 'D' : actualDiff > 0 ? 'W' : 'L';

  if (predictedOutcome === actualOutcome) {
    breakdown.outcome = 3;
    points += 3;
  }

  if (predictedDiff === actualDiff) {
    breakdown.goalDifference = 2;
    points += 2;
  }

  if (
    prediction.predicted_home === result.home_score &&
    prediction.predicted_away === result.away_score
  ) {
    breakdown.exactScore = 3;
    points += 3;
  }

  const scorerSet = new Set(scorers.map((s) => s.toLowerCase()));
  const assistSet = new Set(assists.map((a) => a.toLowerCase()));

  for (const goal of result.match_goals || []) {
    if (goal.scorer && scorerSet.has(goal.scorer.toLowerCase())) {
      breakdown.scorers += 2;
      points += 2;
    }
    if (goal.assist && assistSet.has(goal.assist.toLowerCase())) {
      breakdown.assists += 1;
      points += 1;
    }
  }

  const total = points * breakdown.multiplier;
  return { points: total, breakdown };
}

export function scoreGroupPrediction(groupPrediction, standings) {
  let points = 0;

  if (groupPrediction.winner_team === standings[0]) points += 5;

  const topTwo = new Set(standings.slice(0, 2));
  if (topTwo.has(groupPrediction.winner_team)) points += 3;
  if (topTwo.has(groupPrediction.runner_up_team)) points += 3;

  return points;
}
