import type { ActivityType, MedalDistinction, MedalRules, MedalTier, MedalVariant, Sticker, PlayerStats } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (counters: Partial<Record<ActivityType, number>>) => boolean;
}

const at = (counters: Partial<Record<ActivityType, number>>, key: ActivityType) => counters[key] ?? 0;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primeiro_palpite', name: 'Estreia', description: 'Fez o primeiro palpite', icon: '🎯', check: (c) => at(c, 'prediction') >= 1 },
  { id: 'palpiteiro', name: 'Palpiteiro', description: 'Palpitou em 10 jogos', icon: '📝', check: (c) => at(c, 'prediction') >= 10 },
  { id: 'vidente', name: 'Vidente', description: 'Acertou 3 placares exatos', icon: '🔮', check: (c) => at(c, 'exact_score') >= 3 },
  { id: 'fiel', name: 'Fiel', description: 'Fez 5 check-ins na arquibancada', icon: '🧱', check: (c) => at(c, 'checkin') >= 5 },
  { id: 'presente', name: 'Presente!', description: 'Primeiro check-in na arquibancada', icon: '🎟️', check: (c) => at(c, 'checkin') >= 1 },
  { id: 'social', name: 'Turma Reunida', description: 'Entrou em uma liga', icon: '🤝', check: (c) => at(c, 'league_join') >= 1 },
  { id: 'duelista', name: 'Duelista', description: 'Venceu um duelo', icon: '⚔️', check: (c) => at(c, 'duel_win') >= 1 },
  { id: 'jurado', name: 'Jurado', description: 'Votou no craque de 5 jogos', icon: '⭐', check: (c) => at(c, 'mvp_vote') >= 5 },
  { id: 'voz', name: 'Voz da Torcida', description: 'Mandou 3 mensagens no mural', icon: '📣', check: (c) => at(c, 'wall_message') >= 3 },
  { id: 'visionario', name: 'Visionário', description: 'Fez os palpites de longo prazo', icon: '🔭', check: (c) => at(c, 'long_term_prediction') >= 1 },
];

export const SPECIAL_ACHIEVEMENTS: Omit<AchievementDef, 'check'>[] = [
  { id: 'lider', name: 'Líder por um dia', description: 'Liderou o ranking do bolão', icon: '🥇' },
  { id: 'colecionador', name: 'Colecionador', description: 'Completou metade do álbum', icon: '📒' },
  { id: 'album_completo', name: 'Álbum Completo', description: 'Completou o álbum de figurinhas', icon: '🏆' },
];

export const ALL_ACHIEVEMENTS = [...ACHIEVEMENTS, ...SPECIAL_ACHIEVEMENTS];

export function unlockedAchievements(counters: Partial<Record<ActivityType, number>>, already: Set<string>) {
  return ACHIEVEMENTS.filter((a) => !already.has(a.id) && a.check(counters)).map((a) => a.id);
}

export interface MedalCandidate {
  uid: string;
  kaleoPoints: number;
  bolaoRank: number | null;
  checkins: number;
  exactScores: number;
  linkedTeamId: string | null;
}

export interface MedalAward {
  uid: string;
  tier: MedalTier;
  variant: MedalVariant;
  distinctions: MedalDistinction[];
}

export function computeMedals(candidates: MedalCandidate[], rules: MedalRules, championTeamId: string | null): MedalAward[] {
  if (candidates.length === 0) return [];
  const maxPoints = Math.max(...candidates.map((c) => c.kaleoPoints), 1);
  const legendaryByPoints = Math.max(1, Math.ceil(candidates.length * rules.legendaryTopPct));
  const byPoints = [...candidates].sort((a, b) => b.kaleoPoints - a.kaleoPoints);
  const topPointsUids = new Set(byPoints.slice(0, legendaryByPoints).filter((c) => c.kaleoPoints > 0).map((c) => c.uid));
  const maxCheckins = Math.max(...candidates.map((c) => c.checkins));
  const maxExact = Math.max(...candidates.map((c) => c.exactScores));

  return candidates.map((c) => {
    const ratio = c.kaleoPoints / maxPoints;
    const legendary = (c.bolaoRank !== null && c.bolaoRank <= rules.legendaryTopBolao) || topPointsUids.has(c.uid);
    const tier: MedalTier = legendary ? 'legendary' : ratio >= rules.goldPct ? 'gold' : ratio >= rules.silverPct ? 'silver' : 'bronze';
    const distinctions: MedalDistinction[] = [];
    if (c.bolaoRank === 1) distinctions.push('bolao_champion');
    if (maxCheckins > 0 && c.checkins === maxCheckins) distinctions.push('most_loyal');
    if (maxExact > 0 && c.exactScores === maxExact) distinctions.push('best_predictor');
    const variant: MedalVariant = c.linkedTeamId
      ? c.linkedTeamId === championTeamId
        ? 'athlete_champion'
        : 'athlete'
      : 'fan';
    return { uid: c.uid, tier, variant, distinctions };
  });
}

export const DISTINCTION_LABEL: Record<MedalDistinction, string> = {
  bolao_champion: '👑 Campeão do Bolão',
  most_loyal: '🧱 Torcedor Mais Fiel',
  best_predictor: '🔮 Melhor Vidente',
};

export function playerCard(stats: Pick<PlayerStats, 'goals' | 'assists' | 'yellow' | 'red' | 'mvpCount'> | null) {
  const s = stats ?? { goals: 0, assists: 0, yellow: 0, red: 0, mvpCount: 0 };
  const clamp = (n: number) => Math.max(30, Math.min(99, Math.round(n)));
  const finishing = clamp(55 + s.goals * 11);
  const creation = clamp(55 + s.assists * 12);
  const discipline = clamp(95 - s.yellow * 12 - s.red * 35);
  const impact = clamp(55 + s.mvpCount * 18 + s.goals * 4);
  const overall = clamp((finishing + creation + discipline + impact) / 4);
  return { overall, finishing, creation, discipline, impact };
}

const RARITY_WEIGHT = { common: 80, rare: 17, shiny: 3 } as const;

export function drawPack(stickers: Pick<Sticker, 'id' | 'rarity'>[], size: number, random: () => number = Math.random) {
  if (stickers.length === 0) return [];
  const total = stickers.reduce((sum, s) => sum + RARITY_WEIGHT[s.rarity], 0);
  const picks: string[] = [];
  for (let i = 0; i < size; i += 1) {
    let roll = random() * total;
    for (const sticker of stickers) {
      roll -= RARITY_WEIGHT[sticker.rarity];
      if (roll <= 0) {
        picks.push(sticker.id);
        break;
      }
    }
    if (picks.length <= i) picks.push(stickers[stickers.length - 1]?.id ?? '');
  }
  return picks;
}
