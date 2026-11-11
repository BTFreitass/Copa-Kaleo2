import type { Score, ScoringRules } from './types';

export type Outcome = 'H' | 'D' | 'A';
export type PredictionResult = 'exact' | 'winner_diff' | 'winner' | 'miss';

export function outcomeOf(score: Score): Outcome {
  if (score.home > score.away) return 'H';
  if (score.home < score.away) return 'A';
  return 'D';
}

export function scorePrediction(
  prediction: Score & { isJoker: boolean },
  result: Score,
  rules: ScoringRules,
): { points: number; result: PredictionResult } {
  const kind = classify(prediction, result);
  const base =
    kind === 'exact'
      ? rules.exactScore
      : kind === 'winner_diff'
        ? rules.correctWinnerAndDiff
        : kind === 'winner'
          ? rules.correctWinner
          : 0;
  return { points: prediction.isJoker ? base * rules.jokerMultiplier : base, result: kind };
}

function classify(prediction: Score, result: Score): PredictionResult {
  if (prediction.home === result.home && prediction.away === result.away) return 'exact';
  if (outcomeOf(prediction) !== outcomeOf(result)) return 'miss';
  if (prediction.home - prediction.away === result.home - result.away) return 'winner_diff';
  return 'winner';
}

export function winnerOf(score: Score, penalties: Score | null): 'home' | 'away' | null {
  if (score.home !== score.away) return score.home > score.away ? 'home' : 'away';
  if (penalties && penalties.home !== penalties.away) return penalties.home > penalties.away ? 'home' : 'away';
  return null;
}
