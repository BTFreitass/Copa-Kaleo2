import type { Stage, TeamSnapshot, TournamentFormat } from './types';
import { FUTSAL_TIMING } from './constants';

export interface BuiltMatch {
  code: string;
  stage: Stage;
  group: string | null;
  order: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  feedsFrom?: { home: string; away: string };
  kickoffAt: number;
}

export interface BuildResult {
  groups: Record<string, string>;
  matches: BuiltMatch[];
  endsAt: number;
}

export class TournamentFormatError extends Error {}

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOP';

export function validateFormat(format: TournamentFormat, teamCount: number): string | null {
  if (teamCount < 2) return 'Cadastre pelo menos 2 times.';
  if (format.groupCount === 0) {
    return isPowerOfTwo(teamCount) ? null : 'Sem fase de grupos, o número de times precisa ser 2, 4, 8 ou 16.';
  }
  const smallestGroup = Math.floor(teamCount / format.groupCount);
  if (smallestGroup < 2) return 'Cada grupo precisa de pelo menos 2 times.';
  if (format.advancePerGroup < 1 || format.advancePerGroup > smallestGroup) {
    return `Com grupos de ${smallestGroup} times, avançam no máximo ${smallestGroup} por grupo.`;
  }
  const qualifiers = format.groupCount * format.advancePerGroup;
  if (qualifiers > 1 && !isPowerOfTwo(qualifiers)) {
    return `O mata-mata precisa de 2, 4, 8 ou 16 classificados (hoje: ${qualifiers}).`;
  }
  return null;
}

export function buildTournament(
  format: TournamentFormat,
  teams: Pick<TeamSnapshot, 'id'>[],
  startsAt: number,
): BuildResult {
  const error = validateFormat(format, teams.length);
  if (error) throw new TournamentFormatError(error);

  const groups: Record<string, string> = {};
  const draft: Omit<BuiltMatch, 'order' | 'kickoffAt'>[] = [];

  let seeds: string[];
  if (format.groupCount > 0) {
    const buckets: string[][] = Array.from({ length: format.groupCount }, () => []);
    teams.forEach((team, index) => {
      const round = Math.floor(index / format.groupCount);
      const position = index % format.groupCount;
      const bucket = round % 2 === 0 ? position : format.groupCount - 1 - position;
      buckets[bucket]?.push(team.id);
    });
    const rounds = buckets.map((ids, g) => {
      const letter = GROUP_LETTERS[g] ?? `G${g}`;
      ids.forEach((id) => (groups[id] = letter));
      return roundRobin(ids).map((pairs) => pairs.map(([home, away]) => ({ letter, home, away })));
    });
    const maxRounds = Math.max(...rounds.map((r) => r.length));
    let counter = 1;
    for (let r = 0; r < maxRounds; r += 1) {
      for (const groupRounds of rounds) {
        for (const pair of groupRounds[r] ?? []) {
          draft.push({
            code: `G${counter++}`,
            stage: 'group',
            group: pair.letter,
            homeTeamId: pair.home,
            awayTeamId: pair.away,
          });
        }
      }
    }
    seeds = [];
    for (let rank = 1; rank <= format.advancePerGroup; rank += 1) {
      for (let g = 0; g < format.groupCount; g += 1) seeds.push(`${rank}${GROUP_LETTERS[g]}`);
    }
  } else {
    seeds = teams.map((_, i) => `T${i + 1}`);
  }

  if (seeds.length >= 2) draft.push(...buildKnockout(seeds, format.thirdPlaceMatch, format.groupCount === 0 ? teams : null));

  const timing = matchTiming(format);
  const slot = (timing.matchSlotMin + format.breakBetweenMatchesMin) * 60_000;
  const matches = draft.map((m, i) => ({ ...m, order: i + 1, kickoffAt: startsAt + i * slot }));
  const last = matches[matches.length - 1];
  return { groups, matches, endsAt: last ? last.kickoffAt + timing.matchSlotMin * 60_000 : startsAt };
}

export function matchTiming(format: Pick<TournamentFormat, 'matchDurationMin' | 'halfDurationMin' | 'halftimeMin'> | null | undefined) {
  const halfMin = format?.halfDurationMin ?? (format?.matchDurationMin ? Math.round(format.matchDurationMin / 2) : FUTSAL_TIMING.halfDurationMin);
  const halftimeMin = format?.halftimeMin ?? FUTSAL_TIMING.halftimeMin;
  return { halfMin, halftimeMin, playMin: halfMin * 2, matchSlotMin: halfMin * 2 + halftimeMin };
}

function buildKnockout(seeds: string[], thirdPlace: boolean, directTeams: Pick<TeamSnapshot, 'id'>[] | null) {
  const out: Omit<BuiltMatch, 'order' | 'kickoffAt'>[] = [];
  const order = bracketOrder(seeds.length);
  let current: string[] = [];
  const firstStage = stageForSize(seeds.length);
  for (let i = 0; i < order.length; i += 2) {
    const a = seeds[(order[i] ?? 1) - 1] ?? '';
    const b = seeds[(order[i + 1] ?? 1) - 1] ?? '';
    const code = `${codePrefix(firstStage)}${i / 2 + 1}`;
    const directHome = directTeams ? directTeams[(order[i] ?? 1) - 1]?.id ?? null : null;
    const directAway = directTeams ? directTeams[(order[i + 1] ?? 1) - 1]?.id ?? null : null;
    out.push({
      code: firstStage === 'final' ? 'F' : code,
      stage: firstStage,
      group: null,
      homeTeamId: directHome,
      awayTeamId: directAway,
      feedsFrom: directTeams ? undefined : { home: a, away: b },
    });
    current.push(firstStage === 'final' ? 'F' : code);
  }
  let size = seeds.length / 2;
  let semis: string[] = firstStage === 'semi' ? [...current] : [];
  while (size >= 2) {
    const stage = stageForSize(size);
    const next: string[] = [];
    const roundMatches: Omit<BuiltMatch, 'order' | 'kickoffAt'>[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const code = stage === 'final' ? 'F' : `${codePrefix(stage)}${i / 2 + 1}`;
      roundMatches.push({
        code,
        stage,
        group: null,
        homeTeamId: null,
        awayTeamId: null,
        feedsFrom: { home: `W-${current[i]}`, away: `W-${current[i + 1]}` },
      });
      next.push(code);
    }
    if (stage === 'semi') semis = next;
    if (stage === 'final' && thirdPlace && semis.length === 2) {
      out.push({
        code: 'T3',
        stage: 'third_place',
        group: null,
        homeTeamId: null,
        awayTeamId: null,
        feedsFrom: { home: `L-${semis[0]}`, away: `L-${semis[1]}` },
      });
    }
    out.push(...roundMatches);
    current = next;
    size /= 2;
  }
  return out;
}

export function bracketOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const total = order.length * 2 + 1;
    order = order.flatMap((seed) => [seed, total - seed]);
  }
  return order;
}

function roundRobin(ids: string[]): [string, string][][] {
  const list: (string | null)[] = [...ids];
  if (list.length % 2 === 1) list.push(null);
  const rounds: [string, string][][] = [];
  const n = list.length;
  for (let r = 0; r < n - 1; r += 1) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i += 1) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a && b) pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop() ?? null);
  }
  return rounds;
}

function stageForSize(size: number): Stage {
  if (size >= 16) return 'round_of_16';
  if (size === 8) return 'quarter';
  if (size === 4) return 'semi';
  return 'final';
}

function codePrefix(stage: Stage) {
  return stage === 'round_of_16' ? 'R' : stage === 'quarter' ? 'QF' : stage === 'semi' ? 'SF' : 'F';
}

function isPowerOfTwo(n: number) {
  return n >= 2 && (n & (n - 1)) === 0;
}

export function describeSlot(label: string) {
  const group = /^(\d)([A-P])$/.exec(label);
  if (group) return `${group[1]}º do Grupo ${group[2]}`;
  if (label.startsWith('W-')) return `Vencedor ${label.slice(2)}`;
  if (label.startsWith('L-')) return `Perdedor ${label.slice(2)}`;
  return label;
}
