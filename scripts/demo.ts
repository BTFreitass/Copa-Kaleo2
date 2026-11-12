import { TOURNAMENT_ID, auth, call, db, idToken, seeded, waitFor } from './emulator';
import { FieldValue } from 'firebase-admin/firestore';
import type { Match, Player } from '@copa/shared';

const random = seeded(7);
const FINISHED = Number(process.env.DEMO_FINISHED ?? 6);

const WALL = [
  'Vamo Kaleo! Hoje é dia de taça 🏆',
  'Que golaço foi aquele no primeiro jogo, meu Deus',
  'Mãe, olha eu no telão! 👋',
  'Arbitragem tá de parabéns hoje',
  'Alguém viu meu boné azul perto do campo?',
  'Bora bater o recorde de torcida!',
  'O pastel da barraca 3 tá imperdível',
  'Melhor Copa Kaleo de todas 💜',
];

const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]!;
const goals = () => [0, 0, 1, 1, 1, 2, 2, 3][Math.floor(random() * 8)]!;

async function main() {
  const { users } = await auth.listUsers(1000);
  const people = users
    .filter((u) => u.email?.startsWith('torcedor'))
    .map((u) => ({ uid: u.uid, name: u.displayName ?? 'Torcedor', email: u.email! }))
    .sort((a, b) => Number(a.email.match(/\d+/)?.[0]) - Number(b.email.match(/\d+/)?.[0]));
  if (people.length === 0) throw new Error('Rode "npm run seed" antes.');

  const tokens = new Map<string, string>();
  const token = async (email: string) => tokens.get(email) ?? tokens.set(email, await idToken(email)).get(email)!;
  const mesario = await idToken('mesario@copakaleo.dev');
  const players = (await db.collection('players').where('tournamentId', '==', TOURNAMENT_ID).get()).docs.map((d) => ({ ...(d.data() as Player), id: d.id }));
  const matches = (await db.collection('matches').where('tournamentId', '==', TOURNAMENT_ID).get()).docs
    .map((d) => ({ ...(d.data() as Match), id: d.id }))
    .sort((a, b) => a.order - b.order);
  const group = matches.filter((m) => m.stage === 'group');

  console.log('📝 Palpites dos torcedores na fase de grupos');
  await db.doc(`tournaments/${TOURNAMENT_ID}`).update({ phase: 'matchday', status: 'group_stage' });
  for (const m of group) {
    for (const p of people) {
      await db.doc(`predictions/${m.id}_${p.uid}`).set({
        tournamentId: TOURNAMENT_ID, matchId: m.id, uid: p.uid, displayName: p.name, stage: m.stage,
        home: goals(), away: goals(), isJoker: false, createdAt: Date.now(), updatedAt: Date.now(), points: null,
      });
    }
  }

  const league = await call<{ leagueId: string; inviteCode: string }>('createLeague', { name: 'Galera da Igreja', tournamentId: TOURNAMENT_ID }, await token(people[0]!.email));
  for (const p of people.slice(1, 5)) await call('joinLeague', { code: league.inviteCode }, await token(p.email));
  console.log(`👥 Liga "Galera da Igreja" criada (código ${league.inviteCode}, 5 membros)`);

  const addEvent = (m: Match, side: 'home' | 'away', type: 'goal' | 'yellow' | 'red', minute: number, period: number) => {
    const teamId = side === 'home' ? m.homeTeamId! : m.awayTeamId!;
    const roster = players.filter((p) => p.teamId === teamId && p.position !== 'GK');
    const who = pick(roster);
    const assist = type === 'goal' && random() < 0.5 ? roster.find((p) => p.id !== who.id) : undefined;
    return db.collection(`matches/${m.id}/events`).add({
      type, minute, period, teamId, playerId: who.id, playerName: who.name,
      ...(assist ? { assistPlayerId: assist.id, assistPlayerName: assist.name } : {}),
      createdBy: 'demo', createdAt: Date.now(), voided: false,
    });
  };

  const startMatch = async (m: Match) => {
    await db.doc(`matches/${m.id}`).update({ status: 'live', clockStartedAt: Date.now(), period: 1 });
    const { token: qr } = await call<{ token: string }>('rotateCheckinToken', { matchId: m.id }, mesario);
    for (const p of people.slice(0, 3 + Math.floor(random() * 9))) await call('checkIn', { matchId: m.id, token: qr }, await token(p.email));
  };

  console.log('⚽ Jogos encerrados');
  for (const m of group.slice(0, FINISHED)) {
    await startMatch(m);
    const final = { home: goals(), away: goals() };
    for (const side of ['home', 'away'] as const) {
      for (let g = 0; g < final[side]; g += 1) {
        await addEvent(m, side, 'goal', 1 + Math.floor(random() * 28), random() < 0.5 ? 1 : 2);
        await db.doc(`matches/${m.id}`).update({ [`score.${side}`]: FieldValue.increment(1) });
      }
      if (random() < 0.5) await addEvent(m, side, 'yellow', 5 + Math.floor(random() * 20), 2);
      if (random() < 0.08) await addEvent(m, side, 'red', 25, 2);
    }
    await db.doc(`matches/${m.id}`).update({ status: 'finished', finishedAt: Date.now() });
    const candidates = players.filter((p) => p.teamId === m.homeTeamId || p.teamId === m.awayTeamId);
    for (const p of people.slice(0, 8)) await db.doc(`matches/${m.id}/mvpVotes/${p.uid}`).set({ playerId: candidates[Math.floor(random() * 3)]!.id, createdAt: Date.now() });
    await waitFor(`pontuação de ${m.code}`, async () => (await db.collection('predictions').where('matchId', '==', m.id).get()).docs.every((d) => d.get('points') !== null), 60000);
    const done = (await db.doc(`matches/${m.id}`).get()).data() as Match;
    console.log(`   ${m.code.padEnd(3)} ${done.home!.shortName} ${done.score.home} x ${done.score.away} ${done.away!.shortName}`);
  }

  const live = group[FINISHED];
  if (live) {
    await startMatch(live);
    await addEvent(live, 'home', 'goal', 4, 1);
    await db.doc(`matches/${live.id}`).update({ 'score.home': FieldValue.increment(1) });
    const now = (await db.doc(`matches/${live.id}`).get()).data() as Match;
    console.log(`🔴 AO VIVO: ${now.home!.shortName} 1 x 0 ${now.away!.shortName}`);
  }

  console.log('💬 Mural da torcida');
  for (const [i, text] of WALL.entries()) {
    const p = people[i % people.length]!;
    await db.collection('wallMessages').add({
      tournamentId: TOURNAMENT_ID, uid: p.uid, displayName: p.name, text,
      status: i < WALL.length - 2 ? 'approved' : 'pending', createdAt: Date.now() - (WALL.length - i) * 60000,
    });
  }

  console.log('🃏 Abrindo pacotes de figurinhas');
  for (const p of people.slice(0, 6)) {
    const packs = await db.collection(`users/${p.uid}/packs`).where('opened', '==', false).get();
    for (const pack of packs.docs.slice(0, 4)) await call('openPack', { packId: pack.id }, await token(p.email));
  }

  const top = await db.collection('leaderboard').where('tournamentId', '==', TOURNAMENT_ID).orderBy('totalPoints', 'desc').limit(3).get();
  console.log('\n🏆 Top 3 do bolão');
  for (const d of top.docs) console.log(`   ${d.get('rank')}º ${d.get('displayName')} · ${d.get('totalPoints')} pts`);
  console.log(`\n✅ Pronto: ${FINISHED} jogos encerrados, 1 ao vivo, ${group.length - FINISHED - 1} por jogar.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
