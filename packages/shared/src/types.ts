export type Millis = number;

export type Stage = 'group' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final';
export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed';
export type TournamentPhase = 'pre' | 'matchday' | 'post';
export type TournamentStatus = 'upcoming' | 'group_stage' | 'knockout' | 'finished';
export type MedalTier = 'bronze' | 'silver' | 'gold' | 'legendary';
export type MedalVariant = 'fan' | 'athlete' | 'athlete_champion';
export type MedalDistinction = 'bolao_champion' | 'most_loyal' | 'best_predictor';
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export type DuelScope = 'day' | 'group' | 'knockout';

export type ActivityType =
  | 'welcome'
  | 'prediction'
  | 'long_term_prediction'
  | 'exact_score'
  | 'correct_winner'
  | 'checkin'
  | 'mvp_vote'
  | 'wall_message'
  | 'league_join'
  | 'duel_win'
  | 'achievement';

export interface ScoringRules {
  exactScore: number;
  correctWinnerAndDiff: number;
  correctWinner: number;
  jokerMultiplier: number;
}

export interface LongTermScoring {
  champion: number;
  topScorer: number;
  revelation: number;
}

export interface MedalRules {
  silverPct: number;
  goldPct: number;
  legendaryTopBolao: number;
  legendaryTopPct: number;
}

export interface TournamentFormat {
  teamCount: number;
  groupCount: number;
  advancePerGroup: number;
  thirdPlaceMatch: boolean;
  matchDurationMin: number;
  breakBetweenMatchesMin: number;
  dayStartsAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  season: number;
  edition: number;
  phase: TournamentPhase;
  status: TournamentStatus;
  eventDate: string;
  format: TournamentFormat;
  firstKickoffAt: Millis | null;
  scoringRules: ScoringRules;
  longTermScoring: LongTermScoring;
  kaleoPointsRules: Record<ActivityType, number>;
  medalRules: MedalRules;
  medalArt: Partial<Record<MedalTier, string>>;
  jokerLimits: { group: number; knockout: number };
  participantCount: number;
  championTeamId?: string;
  revelationTeamId?: string;
  mvpTally?: Record<string, number>;
}

export interface TeamSnapshot {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
  primaryColor: string;
}

export interface Team extends TeamSnapshot {
  tournamentId: string;
  slug: string;
  secondaryColor: string;
  group: string | null;
}

export interface Player {
  id: string;
  tournamentId: string;
  teamId: string;
  name: string;
  number: number;
  position: Position;
  photoUrl?: string;
  linkedUid?: string;
}

export interface Score {
  home: number;
  away: number;
}

export interface CrowdStats {
  homePct: number;
  drawPct: number;
  awayPct: number;
  topScore: string;
  total: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  code: string;
  stage: Stage;
  group: string | null;
  order: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  home: TeamSnapshot | null;
  away: TeamSnapshot | null;
  feedsFrom?: { home: string; away: string };
  kickoffAt: Millis;
  status: MatchStatus;
  period: 1 | 2;
  clockStartedAt: Millis | null;
  clockElapsedMs?: number;
  clockRunning?: boolean;
  score: Score;
  penalties: Score | null;
  finishedAt: Millis | null;
  assignedMesarioUid?: string;
  mvpTally?: Record<string, number>;
  mvp?: { playerId: string; playerName: string };
  crowdStats?: CrowdStats;
}

export type MatchEventType = 'goal' | 'own_goal' | 'penalty_goal' | 'yellow' | 'red' | 'sub' | 'note';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  period: 1 | 2;
  teamId?: string;
  playerId?: string;
  playerName?: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  text?: string;
  createdBy: string;
  createdAt: Millis;
  voided: boolean;
}

export interface Prediction {
  id: string;
  tournamentId: string;
  matchId: string;
  uid: string;
  displayName: string;
  stage: Stage;
  home: number;
  away: number;
  isJoker: boolean;
  createdAt: Millis;
  updatedAt: Millis;
  points: number | null;
  exact?: boolean;
}

export interface LongTermPrediction {
  id: string;
  tournamentId: string;
  uid: string;
  championTeamId: string;
  topScorerPlayerId: string;
  revelationTeamId: string;
  points: number | null;
}

export interface LeaderboardEntry {
  id: string;
  tournamentId: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  totalPoints: number;
  exactScores: number;
  predictionsCount: number;
  rank: number;
  bestRank: number;
  leagueIds: string[];
  updatedAt: Millis;
}

export interface League {
  id: string;
  tournamentId: string;
  name: string;
  inviteCode: string;
  ownerUid: string;
  memberCount: number;
  createdAt: Millis;
}

export interface Duel {
  id: string;
  tournamentId: string;
  scope: DuelScope;
  challengerUid: string;
  challengerName: string;
  opponentUid: string;
  opponentName: string;
  status: 'pending' | 'accepted' | 'declined' | 'finished';
  result?: { challengerPoints: number; opponentPoints: number; winnerUid: string | null };
  createdAt: Millis;
}

export interface Checkin {
  tournamentId: string;
  matchId: string;
  uid: string;
  createdAt: Millis;
}

export interface WallMessage {
  id: string;
  tournamentId: string;
  uid: string;
  displayName: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Millis;
}

export type PostCategory = 'pre_jogo' | 'pos_jogo' | 'bastidores' | 'comunicado' | 'entrevista';

export interface Post {
  id: string;
  tournamentId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  category: PostCategory;
  teamIds: string[];
  matchId?: string;
  authorId: string;
  authorName: string;
  source: 'human' | 'ai_draft';
  status: 'draft' | 'published';
  publishedAt: Millis | null;
  updatedAt: Millis;
}

export interface Album {
  id: string;
  tournamentId: string;
  title: string;
  matchId?: string;
  coverUrl: string;
  photoCount: number;
  createdAt: Millis;
}

export interface Photo {
  id: string;
  storagePath: string;
  url: string;
  width: number;
  height: number;
  order: number;
  caption?: string;
}

export interface Video {
  id: string;
  tournamentId: string;
  title: string;
  platform: 'youtube' | 'instagram';
  externalId: string;
  matchId?: string;
  publishedAt: Millis;
}

export interface PlayerStats {
  id: string;
  tournamentId: string;
  playerId: string;
  name: string;
  teamId: string;
  teamName: string;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  mvpCount: number;
}

export interface HallOfFameEdition {
  id: string;
  edition: number;
  season: number;
  name: string;
  championTeam: TeamSnapshot | null;
  runnerUpTeam: TeamSnapshot | null;
  topScorer: { name: string; teamName: string; goals: number } | null;
  bestPlayer: { name: string; teamName: string } | null;
  biggestWin: string | null;
  bolaoChampion: { displayName: string; points: number } | null;
  medalCounts: Record<MedalTier, number>;
  totalFans: number;
  totalCheckins: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  photoURL: string | null;
  isGuest: boolean;
  favoriteTeamId?: string;
  linkedPlayerId?: string;
  createdAt: Millis;
}

export interface UserEdition {
  id: string;
  tournamentId: string;
  uid: string;
  joinedAt: Millis;
  serialNumber: number;
  kaleoPoints: number;
  counters: Partial<Record<ActivityType, number>>;
  bolaoFinalRank?: number;
}

export interface UserAchievement {
  id: string;
  tournamentId: string;
  unlockedAt: Millis;
}

export interface Medal {
  id: string;
  tournamentId: string;
  tournamentName: string;
  season: number;
  tier: MedalTier;
  variant: MedalVariant;
  distinctions: MedalDistinction[];
  serialNumber: number;
  totalAwarded: number;
  kaleoPoints: number;
  artUrl: string | null;
  revealedAt: Millis | null;
  awardedAt: Millis;
}

export type StickerRarity = 'common' | 'rare' | 'shiny';

export interface Sticker {
  id: string;
  tournamentId: string;
  number: number;
  kind: 'player' | 'team' | 'shiny';
  name: string;
  teamId: string;
  playerId?: string;
  imageUrl?: string;
  rarity: StickerRarity;
}

export interface OwnedSticker {
  id: string;
  tournamentId: string;
  quantity: number;
  firstObtainedAt: Millis;
}

export interface StickerPack {
  id: string;
  tournamentId: string;
  source: ActivityType;
  opened: boolean;
  contents?: string[];
  createdAt: Millis;
}

export interface Trade {
  id: string;
  tournamentId: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  offer: string[];
  request: string[];
  status: 'open' | 'accepted' | 'declined' | 'cancelled';
  createdAt: Millis;
}

export interface Coupon {
  id: string;
  tournamentId: string;
  sponsorName: string;
  sponsorLogoUrl: string;
  title: string;
  description: string;
  minKaleoPoints: number;
  totalCodes: number;
  redeemedCount: number;
  validUntil: Millis;
}

export interface UserCoupon {
  id: string;
  code: string;
  title: string;
  sponsorName: string;
  redeemedAt: Millis;
}

export interface Sponsor {
  name: string;
  logoUrl: string;
  link?: string;
  order: number;
}

export interface SiteSettings {
  activeTournamentId: string;
  liveStream: { active: boolean; platform: 'youtube' | 'twitch'; channelOrVideoId: string };
  sponsors: Sponsor[];
}

export interface Registration {
  id: string;
  tournamentId: string;
  type: 'team' | 'athlete';
  submittedBy: string;
  teamId?: string;
  teamName?: string;
  name: string;
  birthDate: string;
  position?: Position;
  phone: string;
  photoPath?: string;
  documentPath?: string;
  termsAcceptedAt: Millis;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  createdAt: Millis;
}
