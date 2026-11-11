import type { Match, TeamSnapshot } from './types';
import { computeGroupStandings, isGroupFinished } from './standings';
import { winnerOf } from './scoring';

export interface SlotAssignment {
  matchId: string;
  side: 'home' | 'away';
  team: TeamSnapshot;
}

export function resolveBracket(teams: (TeamSnapshot & { group: string | null })[], matches: Match[]): SlotAssignment[] {
  const standings = computeGroupStandings(teams, matches);
  const byCode = new Map(matches.map((m) => [m.code, m]));
  const assignments: SlotAssignment[] = [];

  for (const match of matches) {
    if (!match.feedsFrom) continue;
    for (const side of ['home', 'away'] as const) {
      const label = match.feedsFrom[side];
      const resolved = resolveLabel(label, standings, matches, byCode);
      const current = side === 'home' ? match.homeTeamId : match.awayTeamId;
      if (resolved && resolved.id !== current) assignments.push({ matchId: match.id, side, team: resolved });
    }
  }
  return assignments;
}

function resolveLabel(
  label: string,
  standings: ReturnType<typeof computeGroupStandings>,
  matches: Match[],
  byCode: Map<string, Match>,
): TeamSnapshot | null {
  const group = /^(\d)([A-P])$/.exec(label);
  if (group) {
    const letter = group[2] ?? '';
    if (!isGroupFinished(letter, matches)) return null;
    return standings[letter]?.[Number(group[1]) - 1]?.team ?? null;
  }
  const knockout = /^([WL])-(.+)$/.exec(label);
  if (knockout) {
    const source = byCode.get(knockout[2] ?? '');
    if (!source || source.status !== 'finished' || !source.home || !source.away) return null;
    const winner = winnerOf(source.score, source.penalties);
    if (!winner) return null;
    const wantWinner = knockout[1] === 'W';
    const homeWins = winner === 'home';
    return wantWinner === homeWins ? source.home : source.away;
  }
  return null;
}

export function champion(matches: Match[]): TeamSnapshot | null {
  const final = matches.find((m) => m.stage === 'final');
  if (!final || final.status !== 'finished' || !final.home || !final.away) return null;
  const winner = winnerOf(final.score, final.penalties);
  return winner === 'home' ? final.home : winner === 'away' ? final.away : null;
}

export function runnerUp(matches: Match[]): TeamSnapshot | null {
  const final = matches.find((m) => m.stage === 'final');
  const top = champion(matches);
  if (!final || !top) return null;
  return final.home?.id === top.id ? final.away : final.home;
}
