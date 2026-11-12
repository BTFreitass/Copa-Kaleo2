import { existsSync, readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';
import mysql from 'mysql2/promise';

const PROD = process.argv.includes('--prod');
if (existsSync('.env')) process.loadEnvFile('.env');
if (!PROD) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.GCLOUD_PROJECT ??= 'demo-copakaleo';
}

initializeApp({ projectId: PROD ? 'copakaleo' : 'demo-copakaleo' });
const db = getFirestore();

type Row = Record<string, unknown>;
type Mapper = (d: DocumentData, id: string) => Row;

const at = (ms: unknown) => (typeof ms === 'number' && ms > 0 ? new Date(ms) : null);
const opt = (v: unknown) => (v === undefined ? null : v);

const TABLES: { table: string; collection: string; map: Mapper }[] = [
  {
    table: 'tournaments', collection: 'tournaments',
    map: (d, id) => ({ id, name: d.name, season: d.season, edition: d.edition, phase: d.phase, status: d.status, event_date: opt(d.eventDate), first_kickoff_at: at(d.firstKickoffAt), participant_count: d.participantCount ?? 0, champion_team_id: opt(d.championTeamId), revelation_team_id: opt(d.revelationTeamId) }),
  },
  {
    table: 'teams', collection: 'teams',
    map: (d, id) => ({ id, tournament_id: d.tournamentId, name: d.name, short_name: d.shortName, slug: opt(d.slug), group_name: opt(d.group), primary_color: opt(d.primaryColor), secondary_color: opt(d.secondaryColor), logo_url: opt(d.logoUrl) }),
  },
  {
    table: 'players', collection: 'players',
    map: (d, id) => ({ id, tournament_id: d.tournamentId, team_id: d.teamId, name: d.name, number: opt(d.number), position: opt(d.position), photo_url: opt(d.photoUrl), linked_uid: opt(d.linkedUid) }),
  },
  {
    table: 'users', collection: 'users',
    map: (d, id) => ({ id, display_name: d.displayName ?? 'Torcedor', photo_url: opt(d.photoURL), is_guest: Boolean(d.isGuest), favorite_team_id: opt(d.favoriteTeamId), created_at: at(d.createdAt) }),
  },
  {
    table: 'matches', collection: 'matches',
    map: (d, id) => ({
      id, tournament_id: d.tournamentId, code: d.code, stage: d.stage, group_name: opt(d.group), order_num: d.order,
      home_team_id: opt(d.homeTeamId), away_team_id: opt(d.awayTeamId), kickoff_at: at(d.kickoffAt), status: d.status, period: opt(d.period),
      home_score: d.score?.home ?? 0, away_score: d.score?.away ?? 0, home_penalties: d.penalties?.home ?? null, away_penalties: d.penalties?.away ?? null,
      finished_at: at(d.finishedAt), mvp_player_id: d.mvp?.playerId ?? null, mvp_player_name: d.mvp?.playerName ?? null,
      crowd_home_pct: d.crowdStats?.homePct ?? null, crowd_draw_pct: d.crowdStats?.drawPct ?? null, crowd_away_pct: d.crowdStats?.awayPct ?? null, crowd_total: d.crowdStats?.total ?? null,
    }),
  },
  {
    table: 'predictions', collection: 'predictions',
    map: (d, id) => ({ id, tournament_id: d.tournamentId, match_id: d.matchId, uid: d.uid, display_name: opt(d.displayName), stage: opt(d.stage), home: d.home, away: d.away, is_joker: Boolean(d.isJoker), points: opt(d.points), exact: d.exact === undefined ? null : Boolean(d.exact), created_at: at(d.createdAt), updated_at: at(d.updatedAt) }),
  },
  {
    table: 'leaderboard', collection: 'leaderboard',
    map: (d, id) => ({ id, tournament_id: d.tournamentId, uid: d.uid, display_name: opt(d.displayName), total_points: d.totalPoints ?? 0, exact_scores: d.exactScores ?? 0, predictions_count: d.predictionsCount ?? 0, rank_pos: opt(d.rank), best_rank: opt(d.bestRank), updated_at: at(d.updatedAt) }),
  },
  {
    table: 'leagues', collection: 'leagues',
    map: (d, id) => ({ id, tournament_id: d.tournamentId, name: d.name, invite_code: opt(d.inviteCode), owner_uid: opt(d.ownerUid), member_count: d.memberCount ?? 0, created_at: at(d.createdAt) }),
  },
  {
    table: 'checkins', collection: 'checkins',
    map: (d, id) => ({ id, tournament_id: d.tournamentId, match_id: d.matchId, uid: d.uid, created_at: at(d.createdAt) }),
  },
  {
    table: 'player_stats', collection: 'playerStats',
    map: (d, id) => ({ id, tournament_id: d.tournamentId, player_id: d.playerId, name: opt(d.name), team_id: opt(d.teamId), team_name: opt(d.teamName), goals: d.goals ?? 0, assists: d.assists ?? 0, yellow: d.yellow ?? 0, red: d.red ?? 0, mvp_count: d.mvpCount ?? 0 }),
  },
  {
    table: 'posts', collection: 'posts',
    map: (d, id) => ({ id, tournament_id: d.tournamentId, title: d.title, slug: opt(d.slug), category: opt(d.category), status: opt(d.status), source: opt(d.source), author_name: opt(d.authorName), match_id: opt(d.matchId), excerpt: opt(d.excerpt), content: opt(d.content), cover_image_url: opt(d.coverImageUrl), published_at: at(d.publishedAt), updated_at: at(d.updatedAt) }),
  },
  {
    table: 'wall_messages', collection: 'wallMessages',
    map: (d, id) => ({ id, tournament_id: d.tournamentId, uid: opt(d.uid), display_name: opt(d.displayName), text: opt(d.text), status: opt(d.status), created_at: at(d.createdAt) }),
  },
];

async function insert(conn: mysql.Connection, table: string, rows: Row[]) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]!);
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    await conn.query(`INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES ?`, [chunk.map((r) => columns.map((c) => r[c] ?? null))]);
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    multipleStatements: true,
    timezone: 'local',
  });

  console.log(`🗄️  Criando o banco copa_kaleo a partir de sql/schema.sql`);
  await conn.query(readFileSync('sql/schema.sql', 'utf8'));
  await conn.query('USE copa_kaleo; SET FOREIGN_KEY_CHECKS = 0;');

  console.log(`📥 Copiando do Firestore ${PROD ? 'REAL (copakaleo)' : 'local (emuladores)'}`);
  for (const { table, collection, map } of TABLES) {
    const snap = await db.collection(collection).get();
    await insert(conn, table, snap.docs.map((doc) => map(doc.data(), doc.id)));
    console.log(`   ${table.padEnd(14)} ${snap.size}`);
  }

  const events: Row[] = [];
  for (const match of (await db.collection('matches').get()).docs) {
    for (const e of (await match.ref.collection('events').get()).docs) {
      const d = e.data();
      events.push({ id: e.id, match_id: match.id, type: d.type, minute: opt(d.minute), period: opt(d.period), team_id: opt(d.teamId), player_id: opt(d.playerId), player_name: opt(d.playerName), assist_player_id: opt(d.assistPlayerId), assist_player_name: opt(d.assistPlayerName), text: opt(d.text), voided: Boolean(d.voided), created_at: at(d.createdAt) });
    }
  }
  await insert(conn, 'match_events', events);
  console.log(`   ${'match_events'.padEnd(14)} ${events.length}`);

  const members = (await db.collection('leaderboard').get()).docs.flatMap((doc) =>
    ((doc.get('leagueIds') as string[] | undefined) ?? []).map((leagueId) => ({ league_id: leagueId, uid: doc.get('uid') as string })),
  );
  await insert(conn, 'league_members', members);
  console.log(`   ${'league_members'.padEnd(14)} ${members.length}`);

  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
  await conn.end();
  console.log('\n✅ Pronto. No MySQL Workbench, abra o schema copa_kaleo (as views v_* têm jogos, classificação, artilharia e ranking).');
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
