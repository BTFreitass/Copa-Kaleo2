import { TOURNAMENT_ID, auth, call, db, idToken, seeded, sleep, waitFor } from './emulator';
import { initializeApp as initClient } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { MEDAL_LABEL, type Match, type MedalTier, type Player } from '@copa/shared';

const random = seeded(42);
const results: { check: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: string) => {
  results.push({ check: name, ok, detail });
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const clientApp = initClient({ apiKey: 'demo-key', projectId: 'demo-copakaleo' }, 'client');
const clientAuth = getAuth(clientApp);
const clientDb = getFirestore(clientApp);
connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(clientDb, '127.0.0.1', 8080);

async function expectDenied(label: string, action: () => Promise<unknown>) {
  try {
    await action();
    check(label, false, 'deveria ter sido bloqueado');
  } catch (error) {
    check(label, (error as { code?: string }).code === 'permission-denied', (error as { code?: string }).code);
  }
}

const loadMatches = async () =>
  (await db.collection('matches').where('tournamentId', '==', TOURNAMENT_ID).get()).docs
    .map((d) => ({ ...(d.data() as Match), id: d.id }))
    .sort((a, b) => a.order - b.order);

async function fans() {
  const { users } = await auth.listUsers(1000);
  return users
    .filter((u) => u.email?.startsWith('torcedor'))
    .map((u) => ({ uid: u.uid, name: u.displayName ?? 'Torcedor', email: u.email! }))
    .sort((a, b) => Number(a.email.match(/\d+/)?.[0]) - Number(b.email.match(/\d+/)?.[0]));
}

function randomScore() {
  const g = () => [0, 0, 1, 1, 1, 2, 2, 3][Math.floor(random() * 8)]!;
  return { home: g(), away: g() };
}

async function main() {
  const people = await fans();
  const players = (await db.collection('players').where('tournamentId', '==', TOURNAMENT_ID).get()).docs.map((d) => ({ ...(d.data() as Player), id: d.id }));
  const adminToken = await idToken('admin@copakaleo.dev');
  const mesarioToken = await idToken('mesario@copakaleo.dev');

  console.log('\n🔐 Regras de segurança (cliente real contra o emulador)');
  let matches = await loadMatches();
  const first = matches[0]!;
  const fan = people[0]!;
  await signInWithEmailAndPassword(clientAuth, fan.email, 'kaleo123');
  try {
    await setDoc(doc(clientDb, `predictions/${first.id}_${fan.uid}`), {
      tournamentId: TOURNAMENT_ID, matchId: first.id, uid: fan.uid, displayName: fan.name, stage: first.stage,
      home: 2, away: 1, isJoker: true, createdAt: Date.now(), updatedAt: Date.now(), points: null,
    });
    check('Torcedor registra palpite antes do jogo', true);
  } catch (error) {
    check('Torcedor registra palpite antes do jogo', false, String(error));
  }
  await expectDenied('Torcedor não consegue se dar pontos no palpite', () => updateDoc(doc(clientDb, `predictions/${first.id}_${fan.uid}`), { points: 999 }));
  await expectDenied('Torcedor não consegue escrever no ranking', () => setDoc(doc(clientDb, `leaderboard/${TOURNAMENT_ID}_${fan.uid}`), { totalPoints: 999 }));
  await expectDenied('Torcedor não consegue alterar placar', () => updateDoc(doc(clientDb, `matches/${first.id}`), { score: { home: 9, away: 0 } }));
  await expectDenied('Torcedor não palpita em nome de outro', () => setDoc(doc(clientDb, `predictions/${first.id}_${people[1]!.uid}`), {
    tournamentId: TOURNAMENT_ID, matchId: first.id, uid: people[1]!.uid, displayName: 'x', stage: first.stage, home: 0, away: 0, isJoker: false, createdAt: 0, updatedAt: 0, points: null,
  }));
  await expectDenied('Torcedor não cria a própria medalha', () => setDoc(doc(clientDb, `users/${fan.uid}/medals/${TOURNAMENT_ID}`), { tier: 'legendary' }));
  await expectDenied('Palpite no mata-mata sem confronto definido é bloqueado', () => {
    const semi = matches.find((m) => m.stage === 'semi')!;
    return setDoc(doc(clientDb, `predictions/${semi.id}_${fan.uid}`), {
      tournamentId: TOURNAMENT_ID, matchId: semi.id, uid: fan.uid, displayName: fan.name, stage: 'semi', home: 1, away: 0, isJoker: false, createdAt: 0, updatedAt: 0, points: null,
    });
  });
  await signOut(clientAuth);

  console.log('\n📝 Torcedores palpitam na fase de grupos');
  await db.doc(`tournaments/${TOURNAMENT_ID}`).update({ phase: 'matchday', status: 'group_stage' });
  for (const m of matches.filter((x) => x.stage === 'group')) {
    for (const p of people.slice(1)) {
      const s = randomScore();
      await db.doc(`predictions/${m.id}_${p.uid}`).set({
        tournamentId: TOURNAMENT_ID, matchId: m.id, uid: p.uid, displayName: p.name, stage: m.stage, ...s,
        isJoker: random() < 0.08, createdAt: Date.now(), updatedAt: Date.now(), points: null,
      });
    }
  }
  await waitFor('ranking criado para todos', async () => (await db.collection('leaderboard').where('tournamentId', '==', TOURNAMENT_ID).get()).size >= people.length, 60000);
  check('Ranking criado automaticamente para cada palpiteiro', true);

  const jokerCount = (await db.collection('predictions').where('uid', '==', people[1]!.uid).where('isJoker', '==', true).get()).docs.filter((d) => d.get('stage') === 'group').length;
  await sleep(1500);
  const jokerAfter = (await db.collection('predictions').where('uid', '==', people[1]!.uid).where('isJoker', '==', true).get()).docs.filter((d) => d.get('stage') === 'group').length;
  check('Limite de 1 coringa na fase de grupos é aplicado', jokerAfter <= 1, `${jokerCount} marcados → ${jokerAfter} válido(s)`);

  const leagueA = await call<{ leagueId: string; inviteCode: string }>('createLeague', { name: 'Família Kaleo', tournamentId: TOURNAMENT_ID }, await idToken(people[1]!.email));
  for (const p of people.slice(2, 6)) await call('joinLeague', { code: leagueA.inviteCode }, await idToken(p.email));
  const league = await db.doc(`leagues/${leagueA.leagueId}`).get();
  check('Liga privada com código de convite', league.get('memberCount') === 5, `código ${leagueA.inviteCode}, ${league.get('memberCount')} membros`);

  await db.collection('duels').add({ tournamentId: TOURNAMENT_ID, scope: 'day', challengerUid: people[1]!.uid, challengerName: people[1]!.name, opponentUid: people[2]!.uid, opponentName: people[2]!.name, status: 'accepted', createdAt: Date.now() });

  console.log('\n⚽ Simulando o Dia da Copa');
  matches = await loadMatches();
  for (let i = 0; i < matches.length; i += 1) {
    await waitFor(`times definidos para ${matches[i]!.code}`, async () => {
      const m = (await db.doc(`matches/${matches[i]!.id}`).get()).data() as Match;
      return Boolean(m.homeTeamId && m.awayTeamId);
    }, 60000);
    const m = { ...((await db.doc(`matches/${matches[i]!.id}`).get()).data() as Match), id: matches[i]!.id };

    if (m.stage !== 'group') {
      for (const p of people.slice(1)) {
        await db.doc(`predictions/${m.id}_${p.uid}`).set({
          tournamentId: TOURNAMENT_ID, matchId: m.id, uid: p.uid, displayName: p.name, stage: m.stage, ...randomScore(),
          isJoker: false, createdAt: Date.now(), updatedAt: Date.now(), points: null,
        });
      }
    }

    await db.doc(`matches/${m.id}`).update({ status: 'live', clockStartedAt: Date.now(), period: 1 });
    const { token } = await call<{ token: string }>('rotateCheckinToken', { matchId: m.id }, mesarioToken);
    for (const p of people.slice(0, 2 + Math.floor(random() * 8))) await call('checkIn', { matchId: m.id, token }, await idToken(p.email));
    if (i === 0) {
      await call('checkIn', { matchId: m.id, token: 'token-falso' }, await idToken(people[0]!.email)).then(
        () => check('Check-in com QR falso é recusado', false),
        () => check('Check-in com QR falso é recusado', true),
      );
    }

    const final = randomScore();
    if (m.stage !== 'group' && final.home === final.away) final.home += 1;
    for (const side of ['home', 'away'] as const) {
      const teamId = side === 'home' ? m.homeTeamId! : m.awayTeamId!;
      const roster = players.filter((p) => p.teamId === teamId && p.position !== 'GK');
      for (let g = 0; g < final[side]; g += 1) {
        const scorer = roster[Math.floor(random() * roster.length)]!;
        const assist = random() < 0.5 ? roster.find((p) => p.id !== scorer.id) : undefined;
        await db.collection(`matches/${m.id}/events`).add({
          type: 'goal', minute: 1 + Math.floor(random() * 30), period: 1, teamId, playerId: scorer.id, playerName: scorer.name,
          ...(assist ? { assistPlayerId: assist.id, assistPlayerName: assist.name } : {}), createdBy: 'sim', createdAt: Date.now(), voided: false,
        });
        await db.doc(`matches/${m.id}`).update({ [`score.${side}`]: FieldValue.increment(1) });
      }
      if (random() < 0.4) {
        const booked = roster[Math.floor(random() * roster.length)]!;
        await db.collection(`matches/${m.id}/events`).add({ type: 'yellow', minute: 10, period: 2, teamId, playerId: booked.id, playerName: booked.name, createdBy: 'sim', createdAt: Date.now(), voided: false });
      }
    }
    await db.doc(`matches/${m.id}`).update({ status: 'finished', finishedAt: Date.now() });

    const candidates = players.filter((p) => p.teamId === m.homeTeamId || p.teamId === m.awayTeamId);
    for (const p of people.slice(0, 6)) await db.doc(`matches/${m.id}/mvpVotes/${p.uid}`).set({ playerId: candidates[Math.floor(random() * 3)]!.id, createdAt: Date.now() });

    await waitFor(`pontuação de ${m.code}`, async () => {
      const preds = await db.collection('predictions').where('matchId', '==', m.id).get();
      return preds.docs.every((d) => d.get('points') !== null);
    }, 60000);
    const done = (await db.doc(`matches/${m.id}`).get()).data() as Match;
    console.log(`  ${m.code.padEnd(3)} ${done.home!.shortName} ${done.score.home} x ${done.score.away} ${done.away!.shortName}  ⭐ ${done.mvp?.playerName ?? '-'}  👥 ${done.crowdStats?.total ?? 0} palpites`);
  }

  console.log('\n🔍 Conferindo efeitos colaterais');
  matches = await loadMatches();
  check('Mata-mata preenchido automaticamente', matches.filter((m) => m.stage !== 'group').every((m) => m.homeTeamId && m.awayTeamId));
  const stats = await db.collection('playerStats').where('tournamentId', '==', TOURNAMENT_ID).orderBy('goals', 'desc').limit(1).get();
  check('Artilharia calculada', (stats.docs[0]?.get('goals') ?? 0) > 0, `${stats.docs[0]?.get('name')} com ${stats.docs[0]?.get('goals')} gols`);
  const crowd = matches.find((m) => m.crowdStats)?.crowdStats;
  check('"O que a torcida acha" calculado no início do jogo', Boolean(crowd), crowd ? `${crowd.homePct}% / ${crowd.drawPct}% / ${crowd.awayPct}%` : undefined);
  await waitFor('duelo encerrado', async () => (await db.collection('duels').get()).docs[0]?.get('status') === 'finished', 20000).catch(() => undefined);
  const duel = (await db.collection('duels').get()).docs[0]!;
  check('Duelo encerrado com vencedor', duel.get('status') === 'finished', JSON.stringify(duel.get('result')));
  const leagueBoard = await db.collection('leaderboard').where('leagueIds', 'array-contains', leagueA.leagueId).get();
  check('Ranking da liga', leagueBoard.size === 5);

  const fanToken = await idToken(people[0]!.email);
  const packs = await db.collection(`users/${people[0]!.uid}/packs`).where('opened', '==', false).get();
  check('Pacotes de figurinha concedidos', packs.size > 0, `${packs.size} pacotes para ${people[0]!.name}`);
  for (const p of packs.docs.slice(0, 3)) await call('openPack', { packId: p.id }, fanToken);
  const owned = await db.collection(`users/${people[0]!.uid}/collection`).get();
  check('Abertura de pacote no servidor', owned.size > 0, `${owned.size} figurinhas diferentes`);
  await call('openPack', { packId: packs.docs[0]!.id }, fanToken).then(
    () => check('Pacote não pode ser aberto duas vezes', false),
    () => check('Pacote não pode ser aberto duas vezes', true),
  );

  const coupon = (await db.collection('coupons').limit(1).get()).docs[0]!;
  const code = await call<{ code: string }>('redeemCoupon', { couponId: coupon.id }, fanToken);
  check('Cupom resgatado com Pontos Kaleo', Boolean(code.code), code.code);

  const draft = await call<{ postId: string; usedAi: boolean }>('generateMatchDraft', { matchId: matches[matches.length - 1]!.id }, adminToken);
  const post = await db.doc(`posts/${draft.postId}`).get();
  check('Rascunho pós-jogo da final gerado', post.exists, `"${post.get('title')}" (${draft.usedAi ? 'IA' : 'modelo automático'})`);

  console.log('\n🏅 Encerrando a Copa e entregando medalhas');
  const finish = await call<{ medals: number; medalCounts: Record<MedalTier, number> }>('finishTournament', { tournamentId: TOURNAMENT_ID, revelationTeamId: matches[0]!.awayTeamId }, adminToken);
  check('Medalhas entregues para todos os participantes', finish.medals === people.length, `${finish.medals} medalhas`);
  console.log('   ' + (Object.keys(finish.medalCounts) as MedalTier[]).map((t) => `${MEDAL_LABEL[t].emoji} ${MEDAL_LABEL[t].name}: ${finish.medalCounts[t]}`).join('  '));

  const hall = await db.doc(`hallOfFame/${TOURNAMENT_ID}`).get();
  check('Hall da Fama gravado', hall.exists, `Campeão: ${hall.get('championTeam')?.name}, artilheiro: ${hall.get('topScorer')?.name}`);

  console.log('\n🏆 Top 5 do bolão');
  const top = await db.collection('leaderboard').where('tournamentId', '==', TOURNAMENT_ID).orderBy('totalPoints', 'desc').limit(5).get();
  for (const d of top.docs) {
    const medal = await db.doc(`users/${d.get('uid')}/medals/${TOURNAMENT_ID}`).get();
    const edition = await db.doc(`users/${d.get('uid')}/editions/${TOURNAMENT_ID}`).get();
    console.log(`  ${String(d.get('rank')).padStart(2)}º ${String(d.get('displayName')).padEnd(12)} ${String(d.get('totalPoints')).padStart(3)} pts · ${edition.get('kaleoPoints')} Kaleo · ${MEDAL_LABEL[medal.get('tier') as MedalTier].emoji} ${medal.get('distinctions').join(', ')}`);
  }

  const ranks = top.docs.map((d) => d.get('rank') as number);
  check('Ranking em ordem (1º para quem tem mais pontos)', ranks[0] === 1 && ranks.every((r, i) => i === 0 || r >= ranks[i - 1]!), ranks.join(', '));
  const leaderMedal = await db.doc(`users/${top.docs[0]!.get('uid')}/medals/${TOURNAMENT_ID}`).get();
  check('Líder do bolão recebe medalha Lendária e distinção de campeão', leaderMedal.get('tier') === 'legendary' && (leaderMedal.get('distinctions') as string[]).includes('bolao_champion'));

  await signInWithEmailAndPassword(clientAuth, people[0]!.email, 'kaleo123');
  try {
    await updateDoc(doc(clientDb, `users/${people[0]!.uid}/medals/${TOURNAMENT_ID}`), { revealedAt: Date.now() });
    check('Torcedor revela a própria medalha', true);
  } catch (error) {
    check('Torcedor revela a própria medalha', false, String(error));
  }
  await expectDenied('Torcedor não consegue trocar o nível da medalha', () => updateDoc(doc(clientDb, `users/${people[0]!.uid}/medals/${TOURNAMENT_ID}`), { tier: 'legendary' }));
  await signOut(clientAuth);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? '🎉' : '⚠️'} ${results.length - failed.length}/${results.length} verificações passaram`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
