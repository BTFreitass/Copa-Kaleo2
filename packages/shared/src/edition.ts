import { DEFAULT_JOKER_LIMITS, DEFAULT_KALEO_POINTS, DEFAULT_LONG_TERM_SCORING, DEFAULT_MEDAL_RULES, DEFAULT_SCORING, FUTSAL_TIMING } from './constants';
import type { SiteSettings, Tournament, TournamentFormat } from './types';

export interface NewEditionInput {
  name: string;
  season: number;
  edition: number;
  eventDate: string;
  dayStartsAt: string;
}

export function defaultFormat(dayStartsAt = '08:00'): TournamentFormat {
  return {
    teamCount: 0,
    groupCount: 2,
    advancePerGroup: 2,
    thirdPlaceMatch: true,
    matchDurationMin: FUTSAL_TIMING.halfDurationMin * 2,
    halfDurationMin: FUTSAL_TIMING.halfDurationMin,
    halftimeMin: FUTSAL_TIMING.halftimeMin,
    breakBetweenMatchesMin: 10,
    dayStartsAt,
  };
}

export function newEdition(input: NewEditionInput): Omit<Tournament, 'id'> {
  return {
    name: input.name.trim(),
    season: input.season,
    edition: input.edition,
    phase: 'pre',
    status: 'upcoming',
    eventDate: input.eventDate,
    format: defaultFormat(input.dayStartsAt),
    firstKickoffAt: null,
    scoringRules: DEFAULT_SCORING,
    longTermScoring: DEFAULT_LONG_TERM_SCORING,
    kaleoPointsRules: DEFAULT_KALEO_POINTS,
    medalRules: DEFAULT_MEDAL_RULES,
    medalArt: {},
    jokerLimits: DEFAULT_JOKER_LIMITS,
    participantCount: 0,
  };
}

export function editionId(season: number) {
  return String(season);
}

export function validateEdition(input: NewEditionInput) {
  if (!input.name.trim()) return 'Dê um nome para a edição.';
  if (!Number.isInteger(input.season) || input.season < 2000 || input.season > 2100) return 'Ano inválido.';
  if (!Number.isInteger(input.edition) || input.edition < 1) return 'Número da edição inválido.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)) return 'Escolha a data do evento.';
  if (!/^\d{2}:\d{2}$/.test(input.dayStartsAt)) return 'Escolha o horário de início.';
  return null;
}

export const EMPTY_SITE_SETTINGS: Omit<SiteSettings, 'activeTournamentId'> = {
  liveStream: { active: false, platform: 'youtube', channelOrVideoId: '' },
  sponsors: [],
};
