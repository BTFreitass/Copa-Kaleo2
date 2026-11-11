import type { Match, TeamSnapshot } from './types';
import { computeGroupStandings } from './standings';

const GOAL_WEIGHTS = [0.3, 0.33, 0.22, 0.1, 0.05];

export function qualificationOdds(
  teams: (TeamSnapshot & { group: string | null })[],
  matches: Match[],
  advancePerGroup: number,
  iterations = 4000,
  random: () => number = Math.random,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const team of teams) counts[team.id] = 0;
  const groupMatches = matches.filter((m) => m.stage === 'group');
  const pending = groupMatches.filter((m) => m.status !== 'finished');

  for (let i = 0; i < iterations; i += 1) {
    const simulated = groupMatches.map((m) =>
      m.status === 'finished' ? m : { ...m, status: 'finished' as const, score: { home: goals(random), away: goals(random) } },
    );
    const table = computeGroupStandings(teams, pending.length === 0 ? groupMatches : simulated);
    for (const rows of Object.values(table)) {
      rows.slice(0, advancePerGroup).forEach((row) => {
        counts[row.team.id] = (counts[row.team.id] ?? 0) + 1;
      });
    }
    if (pending.length === 0) {
      return Object.fromEntries(Object.entries(counts).map(([id, c]) => [id, c > 0 ? 100 : 0]));
    }
  }
  return Object.fromEntries(Object.entries(counts).map(([id, c]) => [id, Math.round((c / iterations) * 100)]));
}

function goals(random: () => number) {
  let roll = random();
  for (let g = 0; g < GOAL_WEIGHTS.length; g += 1) {
    roll -= GOAL_WEIGHTS[g] ?? 0;
    if (roll <= 0) return g;
  }
  return GOAL_WEIGHTS.length;
}
