import type { Match, TeamSnapshot } from './types';

export interface StandingRow {
  team: TeamSnapshot;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

type GroupMatch = Pick<Match, 'group' | 'stage' | 'status' | 'homeTeamId' | 'awayTeamId' | 'score'>;

export function computeGroupStandings(teams: (TeamSnapshot & { group: string | null })[], matches: GroupMatch[]) {
  const groups = new Map<string, Map<string, StandingRow>>();
  for (const team of teams) {
    if (!team.group) continue;
    const rows = groups.get(team.group) ?? new Map<string, StandingRow>();
    rows.set(team.id, emptyRow(team));
    groups.set(team.group, rows);
  }
  for (const match of matches) {
    if (match.stage !== 'group' || match.status !== 'finished' || !match.group) continue;
    const rows = groups.get(match.group);
    const home = match.homeTeamId ? rows?.get(match.homeTeamId) : undefined;
    const away = match.awayTeamId ? rows?.get(match.awayTeamId) : undefined;
    if (!home || !away) continue;
    apply(home, match.score.home, match.score.away);
    apply(away, match.score.away, match.score.home);
  }
  const result: Record<string, StandingRow[]> = {};
  for (const [group, rows] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    result[group] = sortRows([...rows.values()]);
  }
  return result;
}

export function sortRows(rows: StandingRow[]) {
  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      b.won - a.won ||
      a.team.name.localeCompare(b.team.name),
  );
}

export function isGroupFinished(group: string, matches: GroupMatch[]) {
  const groupMatches = matches.filter((m) => m.stage === 'group' && m.group === group);
  return groupMatches.length > 0 && groupMatches.every((m) => m.status === 'finished');
}

function emptyRow(team: TeamSnapshot): StandingRow {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
}

function apply(row: StandingRow, scored: number, conceded: number) {
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  row.goalDiff = row.goalsFor - row.goalsAgainst;
  if (scored > conceded) {
    row.won += 1;
    row.points += 3;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += 1;
  } else {
    row.lost += 1;
  }
}
