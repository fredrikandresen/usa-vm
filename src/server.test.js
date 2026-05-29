import test from 'node:test';
import assert from 'node:assert/strict';
import { getStageMultiplier, scoreMatchPrediction } from '../lib/scoring.js';

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
