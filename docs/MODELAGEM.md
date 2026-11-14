# Copa Kaleo 2.0 — Modelagem de Dados

Princípios:
- **Desnormalizar para leitura.** Cada tela pública resolve com 1–2 queries.
- **Agregados são escritos só por Cloud Functions** (`allow write: if false` nas rules).
- **Tudo particionado por `tournamentId`** para viabilizar o Hall da Fama (F20) e as medalhas (F22).
- Papéis vêm de **custom claims** (`admin`, `mesario`), nunca de campos editáveis.

Legenda: 🔒 escrito apenas pelo servidor · 👤 escrito pelo próprio usuário · 🛠️ escrito por admin/mesário

> **Fonte da verdade:** os tipos efetivamente usados estão em [packages/shared/src/types.ts](../packages/shared/src/types.ts) e as permissões em [firestore.rules](../firestore.rules). Diferenças em relação a este documento original: datas são `number` (epoch ms), atletas ficam em `players/{id}` (nível superior), conquistas em `users/{uid}/achievements/{tid}_{achievementId}` com o catálogo no código, e figurinhas brilhantes têm id `{tid}_shiny_{playerId}`.

```ts
type Timestamp = import('firebase/firestore').Timestamp;
type Stage = 'group' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final';
type MedalTier = 'bronze' | 'silver' | 'gold' | 'legendary';
```

## Torneio e times

```ts
// 🛠️ tournaments/{tournamentId}            ex.: "2026"
interface Tournament {
  name: string;
  season: number;
  phase: 'pre' | 'matchday' | 'post';
  status: 'upcoming' | 'group_stage' | 'knockout' | 'finished';
  eventDate: string;                         // "2027-04-xx" — torneio de um dia
  fields: Array<{ id: string; name: string }>;   // hoje: 1 campo
  matchDurationMin: number;                      // ~30
  format: {                                      // F25
    teamCount: number; groupCount: number; advancePerGroup: number;
    thirdPlaceMatch: boolean;
    breakBetweenMatchesMin: number; dayStartsAt: string;   // "08:00"
  };
  firstKickoffAt: Timestamp;                 // trava F07
  jokerLimits: { group: number; knockout: number };
  scoringRules: { exactScore: number; correctWinnerAndDiff: number; correctWinner: number; jokerMultiplier: number };
  longTermScoring: { champion: number; topScorer: number; revelation: number };
  kaleoPointsRules: Record<ActivityType, number>;
  medalRules: { silverPct: number; goldPct: number; legendaryTopBolao: number; legendaryTopPct: number };
  medalArt: Record<MedalTier | 'athlete' | 'athlete_champion', string>;
  championTeamId?: string;
}

// 🛠️ teams/{teamId}
interface Team {
  tournamentId: string;
  name: string; slug: string; shortName: string;
  logoUrl: string; primaryColor: string; secondaryColor: string;   // F24
  group: string | null;
}

// 🛠️ teams/{teamId}/players/{playerId}
interface Player {
  name: string; number: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  photoUrl?: string;
  linkedUid?: string;                        // F18 → Medalha de Atleta
}

// 👤/🛠️ registrations/{registrationId}      F18
interface Registration {
  tournamentId: string;
  type: 'team' | 'athlete';
  teamId?: string;
  submittedBy: string;
  data: { name: string; birthDate: string; documentPath: string; photoPath: string; position?: Player['position'] };
  termsAcceptedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
}
```

## Partidas

```ts
// 🛠️ matches/{matchId}
interface Match {
  tournamentId: string;
  stage: Stage; group: string | null; round: number; bracketSlot?: string;
  homeTeamId: string | null; awayTeamId: string | null;   // null no mata-mata até o confronto ser definido
  home: TeamSnapshot | null; away: TeamSnapshot | null;
  feedsFrom?: { home: string; away: string };             // ex.: "1A", "W-QF1"
  predictionsOpenAt: Timestamp | null;       // 🔒 setado quando os dois times são definidos
  kickoffAt: Timestamp;
  fieldId: string;
  status: 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed';
  clock: { period: 1 | 2 | 'et1' | 'et2' | 'pens'; startedAt: Timestamp | null };
  score: { home: number; away: number } | null;
  penalties?: { home: number; away: number };
  assignedMesarioUid?: string;               // F17
  streamUrl?: string;
  albumId?: string;
  mvp?: { playerId: string; playerName: string; votes: number };   // 🔒 F03
  crowdStats?: { homePct: number; drawPct: number; awayPct: number; topScore: string; total: number };   // 🔒 F08
  qualificationOdds?: Record<string, number>;                     // 🔒 F13
  predictionsScored: boolean;                // 🔒 idempotência
}
interface TeamSnapshot { name: string; shortName: string; logoUrl: string; primaryColor: string }

// 🛠️ matches/{matchId}/events/{eventId}     F17 / F12
interface MatchEvent {
  type: 'kickoff' | 'halftime' | 'fulltime' | 'goal' | 'own_goal' | 'penalty_goal' | 'yellow' | 'red' | 'sub';
  minute: number;
  teamId?: string; playerId?: string; playerName?: string;
  assistPlayerId?: string; subInPlayerId?: string;
  text?: string;                             // narração opcional do lance a lance
  createdBy: string; createdAt: Timestamp;
  voided: boolean;                           // "desfazer" sem apagar histórico
  correction?: Correction;                   // lance lançado depois do jogo encerrado
  undoCorrection?: Correction;               // lance desfeito depois do jogo encerrado
}
// Correction = { reason (10–300), by (uid), byName, at, action: 'add' | 'undo' | 'reopen' }
// matches/{id}.lastCorrection guarda a última correção (inclusive a reabertura)

// 👤 matches/{matchId}/mvpVotes/{uid}        F03
interface MvpVote { playerId: string; createdAt: Timestamp }

// 🔒 matches/{matchId}/private/checkin       F02 — token do QR, nunca legível pelo cliente
interface CheckinSecret { token: string; validFrom: Timestamp; validUntil: Timestamp }
```

## Bolão

```ts
// 👤 predictions/{matchId}_{uid}
interface Prediction {
  tournamentId: string; matchId: string; uid: string; stage: Stage;
  home: number; away: number;
  isJoker: boolean;                          // F06
  createdAt: Timestamp; updatedAt: Timestamp;
  points: number | null;                     // 🔒
}

// 👤 longTermPredictions/{tournamentId}_{uid}   F07
interface LongTermPrediction {
  tournamentId: string; uid: string;
  championTeamId: string; topScorerPlayerId: string; revelationTeamId: string;
  points: number | null;                     // 🔒
}

// 🔒 leaderboard/{tournamentId}_{uid}
interface LeaderboardEntry {
  tournamentId: string; uid: string;
  displayName: string; photoURL: string | null;
  totalPoints: number; exactScores: number; predictionsCount: number;
  rank: number; bestRank: number;            // "Líder por um dia" (F16)
  updatedAt: Timestamp;
}

// 👤 leagues/{leagueId}                      F05
interface League {
  tournamentId: string;
  name: string; inviteCode: string;          // 6 chars, único
  ownerUid: string; memberCount: number;
  createdAt: Timestamp;
}
// 👤 leagues/{leagueId}/members/{uid}        join só com inviteCode válido (callable)
interface LeagueMember { displayName: string; joinedAt: Timestamp }

// 👤 duels/{duelId}                          F09
interface Duel {
  tournamentId: string; round: number; stage: Stage;
  challengerUid: string; opponentUid: string;
  status: 'pending' | 'accepted' | 'declined' | 'finished';
  result?: { challengerPoints: number; opponentPoints: number; winnerUid: string | null };   // 🔒
}
```

## Arquibancada

```ts
// 🔒 checkins/{matchId}_{uid}                F02 — criado pela callable `checkIn(token)`
interface Checkin { tournamentId: string; matchId: string; uid: string; createdAt: Timestamp }

// 👤/🛠️ wallMessages/{messageId}             mural do Telão (F01)
interface WallMessage {
  tournamentId: string; matchId?: string;
  uid: string; displayName: string;
  text: string;                              // máx. 140
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}
```

**Realtime Database (F04)**
```
/reactions/{matchId}/counters/{teamId}/{emoji}: number      🔒 agregado por Function
/reactions/{matchId}/stream/{pushId}: { e: string, t: teamId, ts }   👤 TTL curto, limpo por Function
```

## Conteúdo

```ts
// 🛠️ posts/{postId}                          M1 / F11
interface Post {
  tournamentId: string;
  title: string; slug: string; excerpt: string;
  content: string;                           // Markdown
  coverImageUrl: string;
  category: 'pre_jogo' | 'pos_jogo' | 'bastidores' | 'comunicado' | 'entrevista';
  teamIds: string[]; matchId?: string;
  authorId: string; authorName: string;
  source: 'human' | 'ai_draft';              // F11
  status: 'draft' | 'published';
  publishedAt: Timestamp | null; updatedAt: Timestamp;
}

// 🛠️ albums/{albumId} + /photos/{photoId}   M2
interface Album { tournamentId: string; title: string; matchId?: string; coverUrl: string; photoCount: number; createdAt: Timestamp }
interface Photo { storagePath: string; url: string; thumbUrl: string; width: number; height: number; order: number; caption?: string }

// 🛠️ videos/{videoId}                        M2
interface Video { tournamentId: string; title: string; platform: 'youtube' | 'instagram'; externalId: string; matchId?: string; teamIds: string[]; publishedAt: Timestamp }

// 🔒 socialCards/{cardId}                    F10
interface SocialCard {
  tournamentId: string;
  kind: 'match_result' | 'standings' | 'leaderboard' | 'mvp';
  refId: string;                             // matchId, group, etc.
  imageUrl: string; generatedAt: Timestamp;
}
```

## Estatísticas e legado

```ts
// 🔒 standings/{tournamentId}_{group}        M5
interface GroupStandings {
  tournamentId: string; group: string;
  rows: Array<{ teamId: string; name: string; logoUrl: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDiff: number; points: number; qualificationOdds: number }>;
}

// 🔒 playerStats/{tournamentId}_{playerId}   M5 / F15
interface PlayerStats {
  tournamentId: string; playerId: string; name: string; teamId: string; teamName: string;
  goals: number; assists: number; yellow: number; red: number; mvpCount: number; matchesPlayed: number;
  card: { overall: number; finishing: number; discipline: number; consistency: number; impact: number };   // F15
}

// 🔒 hallOfFame/{tournamentId}               F20 — gerado no encerramento
interface HallOfFameEdition {
  championTeam: TeamSnapshot; runnerUpTeam: TeamSnapshot;
  topScorer: { playerId: string; name: string; goals: number };
  bestPlayer: { playerId: string; name: string; mvpCount: number };
  biggestWin: { matchId: string; label: string };
  bolaoChampion: { uid: string; displayName: string; points: number };
  medalCounts: Record<MedalTier, number>;
  totalFans: number; totalCheckins: number;
}
```

## Usuário, engajamento e gamificação

```ts
// 👤 users/{uid}
interface User {
  displayName: string; photoURL: string | null;
  isGuest: boolean;                          // conta anônima ainda não vinculada
  providers: Array<'google' | 'password' | 'emailLink' | 'phone' | 'facebook' | 'anonymous'>;
  favoriteTeamId?: string;                   // F24
  linkedPlayerId?: string;                   // F18
  fcmTokens: string[];                       // F23
  notificationPrefs: { predictionReminder: boolean; favoriteTeamGoals: boolean; mvpVoting: boolean };
  createdAt: Timestamp;
}

// 🔒 activity/{activityId}                   log bruto, base de Pontos Kaleo e de F21
type ActivityType = 'prediction' | 'exact_score' | 'correct_winner' | 'checkin' | 'mvp_vote' | 'sticker_pack' | 'achievement' | 'duel_win' | 'wall_message' | 'league_join';
interface Activity { tournamentId: string; uid: string; type: ActivityType; refId: string; createdAt: Timestamp }

// 🔒 users/{uid}/editions/{tournamentId}     resumo por edição (Pontos Kaleo + Minha Copa F21)
interface UserEdition {
  joinedAt: Timestamp; serialNumber: number; // ordem de entrada → nº de série da medalha
  kaleoPoints: number;
  counters: { checkins: number; predictions: number; exactScores: number; mvpVotes: number; stickers: number; duelsWon: number };
  bolaoFinalRank?: number;
}

// 🛠️ achievements/{achievementId}           catálogo F16
interface Achievement { name: string; description: string; icon: string; rule: string; kaleoPoints: number }
// 🔒 users/{uid}/achievements/{achievementId}
interface UserAchievement { tournamentId: string; unlockedAt: Timestamp }

// 🔒 users/{uid}/medals/{tournamentId}       F22 — imutável
interface Medal {
  tournamentId: string; tournamentName: string; season: number;
  tier: MedalTier;
  variant: 'fan' | 'athlete' | 'athlete_champion';
  distinctions: Array<'bolao_champion' | 'most_loyal' | 'best_predictor'>;
  serialNumber: number; totalAwarded: number;    // "nº 0042 de 380"
  kaleoPoints: number;
  artUrl: string; shareImageUrl: string;
  revealedAt: Timestamp | null;              // 👤 único campo que o usuário pode setar (animação de revelação)
  awardedAt: Timestamp;
}
```

## Figurinhas (F14) e cupons (F19)

```ts
// 🛠️ stickers/{stickerId}                    gerado a partir dos players
interface Sticker {
  tournamentId: string; playerId?: string; teamId: string;
  kind: 'player' | 'team_badge' | 'special';
  rarity: 'common' | 'rare' | 'shiny';       // shiny: hat-trick, craque do jogo
  number: number; imageUrl: string;
}

// 🔒 users/{uid}/collection/{stickerId}
interface OwnedSticker { tournamentId: string; quantity: number; firstObtainedAt: Timestamp }

// 🔒 users/{uid}/packs/{packId}              aberto via callable `openPack`
interface StickerPack { tournamentId: string; source: ActivityType; opened: boolean; contents?: string[]; createdAt: Timestamp }

// 👤 trades/{tradeId}                        executado via callable `acceptTrade` (transaction)
interface Trade {
  tournamentId: string;
  fromUid: string; toUid: string;
  offer: string[]; request: string[];
  status: 'open' | 'accepted' | 'declined' | 'cancelled';
  createdAt: Timestamp;
}

// 🛠️ coupons/{couponId}
interface Coupon {
  tournamentId: string; sponsorName: string; sponsorLogoUrl: string;
  title: string; description: string;
  requirement: { kind: 'kaleo_points' | 'achievement'; value: string | number };
  codePool: number; redeemedCount: number;   // 🔒
  validUntil: Timestamp;
}
// 🔒 users/{uid}/coupons/{couponId}
interface UserCoupon { code: string; redeemedAt: Timestamp }

// 🛠️ settings/site
interface SiteSettings {
  activeTournamentId: string;
  liveStream: { active: boolean; platform: 'youtube' | 'twitch'; channelOrVideoId: string; matchId?: string };
  sponsors: Array<{ name: string; logoUrl: string; link?: string; order: number; roundSponsorOf?: number[] }>;
}
```

## Cloud Functions previstas

| Function | Gatilho | Responsabilidade |
|---|---|---|
| `onUserCreate` | Auth create | Cria `users/{uid}` |
| `setRole` | Callable (admin) | Custom claims `admin` / `mesario` |
| `onMatchEventWrite` | Firestore | Recalcula placar, `playerStats`, cartas (F15), figurinhas shiny |
| `onMatchFinished` | Firestore (status → finished) | Pontua palpites, leaderboard, ligas, duelos, `crowdStats`, standings, odds (F13), card social (F10), rascunho IA (F11), abre votação MVP, **avança o vencedor no chaveamento e abre os palpites do próximo jogo** |
| `closeMvpVoting` | Cloud Tasks (+15 min) | Fecha F03, grava `mvp` |
| `onPredictionsLocked` | Scheduler / kickoff | Agrega `crowdStats` (F08) |
| `checkIn` | Callable | Valida token do QR (F02) |
| `rotateCheckinToken` | Scheduler | Gera tokens por jogo |
| `joinLeague` | Callable | Valida `inviteCode` (F05) |
| `openPack` / `acceptTrade` | Callable | F14 com transaction |
| `onActivityCreate` | Firestore | Soma Pontos Kaleo, checa conquistas (F16), concede pacotes |
| `redeemCoupon` | Callable | F19 |
| `aggregateReactions` | RTDB | F04 |
| `sendNotifications` | Scheduler + triggers | F23 |
| `onTournamentFinished` | Firestore (status → finished) | Resolve F07, **concede medalhas (F22)**, gera `hallOfFame` (F20), prepara Minha Copa (F21) |

## Índices compostos

- `posts(tournamentId, status, publishedAt desc)`
- `posts(tournamentId, status, category, publishedAt desc)`
- `posts(teamIds array-contains, status, publishedAt desc)`
- `matches(tournamentId, kickoffAt)`
- `matches(tournamentId, status, kickoffAt)`
- `leaderboard(tournamentId, totalPoints desc, exactScores desc)`
- `predictions(matchId, uid)` / `predictions(uid, tournamentId)`
- `playerStats(tournamentId, goals desc)` / `playerStats(tournamentId, yellow desc)`
- `wallMessages(tournamentId, status, createdAt desc)`
- `trades(toUid, status)` / `duels(opponentUid, status)`
- collection group `medals(tournamentId, tier)`
