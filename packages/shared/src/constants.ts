import type { ActivityType, MedalRules, MedalTier, PostCategory, ScoringRules, LongTermScoring, Stage, Position } from './types';

export const FUNCTIONS_REGION = 'southamerica-east1';

export const FUTSAL_TIMING = { halfDurationMin: 20, halftimeMin: 10, halftimePresets: [10, 15] } as const;

export const DEFAULT_SCORING: ScoringRules = {
  exactScore: 10,
  correctWinnerAndDiff: 7,
  correctWinner: 5,
  jokerMultiplier: 2,
};

export const DEFAULT_LONG_TERM_SCORING: LongTermScoring = {
  champion: 30,
  topScorer: 20,
  revelation: 15,
};

export const DEFAULT_KALEO_POINTS: Record<ActivityType, number> = {
  welcome: 10,
  prediction: 5,
  long_term_prediction: 20,
  exact_score: 30,
  correct_winner: 10,
  checkin: 25,
  mvp_vote: 5,
  wall_message: 3,
  league_join: 10,
  duel_win: 20,
  achievement: 15,
};

export const PACK_GRANTS: Partial<Record<ActivityType, number>> = {
  welcome: 2,
  long_term_prediction: 1,
  league_join: 1,
  checkin: 1,
  exact_score: 1,
  duel_win: 1,
  achievement: 1,
};

export const PACK_SIZE = 5;

export const DEFAULT_MEDAL_RULES: MedalRules = {
  silverPct: 0.4,
  goldPct: 0.7,
  legendaryTopBolao: 3,
  legendaryTopPct: 0.01,
};

export const DEFAULT_JOKER_LIMITS = { group: 1, knockout: 1 };

export const CORRECTION_REASON = { min: 10, max: 300 } as const;

export const MVP_VOTING_WINDOW_MS = 10 * 60 * 1000;

export const STAGE_LABEL: Record<Stage, string> = {
  group: 'Fase de grupos',
  round_of_16: 'Oitavas de final',
  quarter: 'Quartas de final',
  semi: 'Semifinal',
  third_place: 'Disputa de 3º lugar',
  final: 'Final',
};

export const CATEGORY_LABEL: Record<PostCategory, string> = {
  pre_jogo: 'Pré-jogo',
  pos_jogo: 'Pós-jogo',
  bastidores: 'Bastidores',
  comunicado: 'Comunicado',
  entrevista: 'Entrevista',
};

export const POSITION_LABEL: Record<Position, string> = {
  GK: 'Goleiro',
  DEF: 'Defensor',
  MID: 'Meio-campo',
  FWD: 'Atacante',
};

export const MEDAL_LABEL: Record<MedalTier, { name: string; title: string; emoji: string }> = {
  bronze: { name: 'Bronze', title: 'Torcedor', emoji: '🥉' },
  silver: { name: 'Prata', title: 'Torcedor Raiz', emoji: '🥈' },
  gold: { name: 'Ouro', title: 'Torcedor de Elite', emoji: '🥇' },
  legendary: { name: 'Lendária', title: 'Lenda da Copa', emoji: '💎' },
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  welcome: 'Boas-vindas',
  prediction: 'Palpite registrado',
  long_term_prediction: 'Palpite de longo prazo',
  exact_score: 'Placar exato',
  correct_winner: 'Acertou o vencedor',
  checkin: 'Check-in na arquibancada',
  mvp_vote: 'Voto no craque',
  wall_message: 'Mensagem no mural',
  league_join: 'Entrou em uma liga',
  duel_win: 'Venceu um duelo',
  achievement: 'Conquista desbloqueada',
};
