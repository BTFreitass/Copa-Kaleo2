import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getMessaging } from 'firebase-admin/messaging';
import {
  DEFAULT_MEDAL_RULES,
  PACK_SIZE,
  champion,
  computeMedals,
  drawPack,
  generateInviteCode,
  runnerUp,
  type Coupon,
  type HallOfFameEdition,
  type LeaderboardEntry,
  type LongTermPrediction,
  type MedalTier,
  type Player,
  type PlayerStats,
  type Sticker,
  type Trade,
  type UserEdition,
} from './types';
import {
  FieldValue,
  auth,
  commitInChunks,
  db,
  displayNameOf,
  ensureLeaderboardEntry,
  getTournament,
  isEmulator,
  listOf,
  randomToken,
  recordActivity,
  requireAdmin,
  requireAuth,
  requireMesario,
  withId,
} from './core';
import { grantSpecialAchievement, loadTournamentState, recomputeRanks } from './results';

const str = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim() === '') throw new HttpsError('invalid-argument', `Campo inválido: ${field}`);
  return value.trim();
};

export const rotateCheckinToken = onCall(async (request) => {
  requireMesario(request);
  const matchId = str(request.data?.matchId, 'matchId');
  const token = randomToken(16);
  const validUntil = Date.now() + 4 * 60 * 60 * 1000;
  await db.doc(`matches/${matchId}/private/checkin`).set({ token, validFrom: Date.now(), validUntil });
  return { token, validUntil };
});

export const checkIn = onCall(async (request) => {
  const { uid } = requireAuth(request);
  const matchId = str(request.data?.matchId, 'matchId');
  const token = str(request.data?.token, 'token');
  const [match, secret] = await Promise.all([
    db.doc(`matches/${matchId}`).get(),
    db.doc(`matches/${matchId}/private/checkin`).get(),
  ]);
  if (!match.exists) throw new HttpsError('not-found', 'Jogo não encontrado.');
  if (!secret.exists || secret.get('token') !== token || Date.now() > (secret.get('validUntil') as number)) {
    throw new HttpsError('failed-precondition', 'QR code inválido ou expirado. Escaneie o QR do telão.');
  }
  const tournamentId = match.get('tournamentId') as string;
  try {
    await db.doc(`checkins/${matchId}_${uid}`).create({ tournamentId, matchId, uid, createdAt: Date.now() });
  } catch (error) {
    if ((error as { code?: number }).code === 6) return { already: true };
    throw error;
  }
  await recordActivity(uid, tournamentId, 'checkin', matchId);
  return { already: false };
});

export const createLeague = onCall(async (request) => {
  const { uid } = requireAuth(request);
  const name = str(request.data?.name, 'name').slice(0, 40);
  const tournamentId = str(request.data?.tournamentId, 'tournamentId');
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i += 1) {
    const clash = await db.collection('leagues').where('inviteCode', '==', inviteCode).limit(1).get();
    if (clash.empty) break;
    inviteCode = generateInviteCode();
  }
  const ref = db.collection('leagues').doc();
  await ref.set({ tournamentId, name, inviteCode, ownerUid: uid, memberCount: 0, createdAt: Date.now() });
  await joinLeagueInternal(uid, ref.id, tournamentId);
  return { leagueId: ref.id, inviteCode };
});

export const joinLeague = onCall(async (request) => {
  const { uid } = requireAuth(request);
  const code = str(request.data?.code, 'code').toUpperCase();
  const found = await db.collection('leagues').where('inviteCode', '==', code).limit(1).get();
  const league = found.docs[0];
  if (!league) throw new HttpsError('not-found', 'Código de liga não encontrado.');
  await joinLeagueInternal(uid, league.id, league.get('tournamentId') as string);
  return { leagueId: league.id };
});

async function joinLeagueInternal(uid: string, leagueId: string, tournamentId: string) {
  const memberRef = db.doc(`leagues/${leagueId}/members/${uid}`);
  if ((await memberRef.get()).exists) return;
  const displayName = await displayNameOf(uid);
  await memberRef.set({ displayName, joinedAt: Date.now() });
  await db.doc(`leagues/${leagueId}`).update({ memberCount: FieldValue.increment(1) });
  const entry = await ensureLeaderboardEntry(tournamentId, uid);
  await entry.update({ leagueIds: FieldValue.arrayUnion(leagueId) });
  await recordActivity(uid, tournamentId, 'league_join', leagueId);
}

export const openPack = onCall(async (request) => {
  const { uid } = requireAuth(request);
  const packId = str(request.data?.packId, 'packId');
  const packRef = db.doc(`users/${uid}/packs/${packId}`);
  const pack = await packRef.get();
  if (!pack.exists) throw new HttpsError('not-found', 'Pacote não encontrado.');
  const tournamentId = pack.get('tournamentId') as string;
  const stickers = listOf<Sticker>(await db.collection('stickers').where('tournamentId', '==', tournamentId).get());
  if (stickers.length === 0) throw new HttpsError('failed-precondition', 'O álbum ainda não foi liberado.');
  const contents = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(packRef);
    if (fresh.get('opened')) throw new HttpsError('already-exists', 'Pacote já aberto.');
    const picks = drawPack(stickers, PACK_SIZE);
    const refs = [...new Set(picks)].map((id) => db.doc(`users/${uid}/collection/${id}`));
    const owned = await Promise.all(refs.map((r) => tx.get(r)));
    const counts = new Map<string, number>();
    picks.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    owned.forEach((snap, i) => {
      const ref = refs[i]!;
      const add = counts.get(ref.id) ?? 0;
      if (snap.exists) tx.update(ref, { quantity: FieldValue.increment(add) });
      else tx.set(ref, { tournamentId, quantity: add, firstObtainedAt: Date.now() });
    });
    tx.update(packRef, { opened: true, contents: picks });
    return picks;
  });
  await checkCollectionAchievements(uid, tournamentId, stickers);
  return { contents };
});

async function checkCollectionAchievements(uid: string, tournamentId: string, stickers: Sticker[]) {
  const owned = await db.collection(`users/${uid}/collection`).where('tournamentId', '==', tournamentId).get();
  const base = stickers.filter((s) => s.kind !== 'shiny');
  const ownedIds = new Set(owned.docs.filter((d) => (d.get('quantity') as number) > 0).map((d) => d.id));
  const have = base.filter((s) => ownedIds.has(s.id)).length;
  if (have >= Math.ceil(base.length / 2)) await grantSpecialAchievement(uid, tournamentId, 'colecionador');
  if (have === base.length) await grantSpecialAchievement(uid, tournamentId, 'album_completo');
}

export const acceptTrade = onCall(async (request) => {
  const { uid } = requireAuth(request);
  const tradeId = str(request.data?.tradeId, 'tradeId');
  const tradeRef = db.doc(`trades/${tradeId}`);
  await db.runTransaction(async (tx) => {
    const trade = withId<Trade>(await tx.get(tradeRef));
    if (trade.toUid !== uid) throw new HttpsError('permission-denied', 'Essa troca não é para você.');
    if (trade.status !== 'open') throw new HttpsError('failed-precondition', 'Troca já encerrada.');
    const giverRefs = trade.offer.map((id) => db.doc(`users/${trade.fromUid}/collection/${id}`));
    const takerRefs = trade.request.map((id) => db.doc(`users/${trade.toUid}/collection/${id}`));
    const receiveFrom = trade.request.map((id) => db.doc(`users/${trade.fromUid}/collection/${id}`));
    const receiveTo = trade.offer.map((id) => db.doc(`users/${trade.toUid}/collection/${id}`));
    const all = [...giverRefs, ...takerRefs, ...receiveFrom, ...receiveTo];
    const snaps = await Promise.all(all.map((r) => tx.get(r)));
    const byPath = new Map(snaps.map((s) => [s.ref.path, s]));
    for (const ref of [...giverRefs, ...takerRefs]) {
      if (((byPath.get(ref.path)?.get('quantity') as number | undefined) ?? 0) < 1) {
        throw new HttpsError('failed-precondition', 'Alguém não tem mais a figurinha da troca.');
      }
    }
    for (const ref of [...giverRefs, ...takerRefs]) tx.update(ref, { quantity: FieldValue.increment(-1) });
    for (const ref of [...receiveFrom, ...receiveTo]) {
      const snap = byPath.get(ref.path);
      if (snap?.exists) tx.update(ref, { quantity: FieldValue.increment(1) });
      else tx.set(ref, { tournamentId: trade.tournamentId, quantity: 1, firstObtainedAt: Date.now() });
    }
    tx.update(tradeRef, { status: 'accepted' });
  });
  return { ok: true };
});

export const redeemCoupon = onCall(async (request) => {
  const { uid } = requireAuth(request);
  const couponId = str(request.data?.couponId, 'couponId');
  const couponRef = db.doc(`coupons/${couponId}`);
  const codesRef = db.doc(`coupons/${couponId}/private/codes`);
  const mineRef = db.doc(`users/${uid}/coupons/${couponId}`);
  return db.runTransaction(async (tx) => {
    const [couponSnap, codesSnap, mine] = await Promise.all([tx.get(couponRef), tx.get(codesRef), tx.get(mineRef)]);
    if (mine.exists) return { code: mine.get('code') as string };
    const coupon = withId<Coupon>(couponSnap);
    if (Date.now() > coupon.validUntil) throw new HttpsError('failed-precondition', 'Cupom expirado.');
    const edition = await tx.get(db.doc(`users/${uid}/editions/${coupon.tournamentId}`));
    const points = (edition.get('kaleoPoints') as number | undefined) ?? 0;
    if (points < coupon.minKaleoPoints) {
      throw new HttpsError('failed-precondition', `Você precisa de ${coupon.minKaleoPoints} Pontos Kaleo (tem ${points}).`);
    }
    const codes = (codesSnap.get('codes') as string[] | undefined) ?? [];
    const code = codes[0];
    if (!code) throw new HttpsError('resource-exhausted', 'Os cupons acabaram.');
    tx.update(codesRef, { codes: codes.slice(1) });
    tx.update(couponRef, { redeemedCount: FieldValue.increment(1) });
    tx.set(mineRef, { code, title: coupon.title, sponsorName: coupon.sponsorName, redeemedAt: Date.now() });
    return { code };
  });
});

export const setRole = onCall(async (request) => {
  requireAdmin(request);
  const email = str(request.data?.email, 'email');
  const role = str(request.data?.role, 'role');
  if (role !== 'admin' && role !== 'mesario') throw new HttpsError('invalid-argument', 'Papel inválido.');
  const value = request.data?.value !== false;
  const user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) throw new HttpsError('not-found', 'Usuário não encontrado. Ele precisa ter feito login uma vez.');
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), [role]: value });
  return { uid: user.uid };
});

export const syncStickers = onCall(async (request) => {
  requireAdmin(request);
  const tournamentId = str(request.data?.tournamentId, 'tournamentId');
  const { teams } = await loadTournamentState(tournamentId);
  const players = listOf<Player>(await db.collection('players').where('tournamentId', '==', tournamentId).get());
  const existingShiny = listOf<Sticker>(
    await db.collection('stickers').where('tournamentId', '==', tournamentId).where('kind', '==', 'shiny').get(),
  );
  let number = 1;
  const ops: Parameters<typeof commitInChunks>[0] = [];
  for (const team of [...teams].sort((a, b) => a.name.localeCompare(b.name))) {
    const n = number++;
    ops.push((b) =>
      b.set(db.doc(`stickers/${tournamentId}_team_${team.id}`), {
        tournamentId,
        number: n,
        kind: 'team',
        name: team.name,
        teamId: team.id,
        imageUrl: team.logoUrl,
        rarity: 'rare',
      }),
    );
    for (const player of players.filter((p) => p.teamId === team.id).sort((a, b) => a.number - b.number)) {
      const pn = number++;
      ops.push((b) =>
        b.set(db.doc(`stickers/${tournamentId}_player_${player.id}`), {
          tournamentId,
          number: pn,
          kind: 'player',
          name: player.name,
          teamId: team.id,
          playerId: player.id,
          imageUrl: player.photoUrl ?? null,
          rarity: 'common',
        }),
      );
    }
  }
  existingShiny.forEach((s) => {
    const sn = number++;
    ops.push((b) => b.update(db.doc(`stickers/${s.id}`), { number: sn }));
  });
  await commitInChunks(ops);
  return { total: number - 1 };
});

export const registerPushToken = onCall(async (request) => {
  requireAuth(request);
  const token = str(request.data?.token, 'token');
  const teamId = typeof request.data?.teamId === 'string' ? request.data.teamId : null;
  if (isEmulator) return { ok: true };
  await getMessaging().subscribeToTopic([token], 'all');
  if (teamId) await getMessaging().subscribeToTopic([token], `team_${teamId}`);
  return { ok: true };
});

export const finishTournament = onCall({ timeoutSeconds: 300 }, async (request) => {
  requireAdmin(request);
  const tournamentId = str(request.data?.tournamentId, 'tournamentId');
  const tournament = await getTournament(tournamentId);
  const { teams, matches } = await loadTournamentState(tournamentId);
  const winner = champion(matches);
  const second = runnerUp(matches);
  const championTeamId = winner?.id ?? (typeof request.data?.championTeamId === 'string' ? request.data.championTeamId : null);
  const revelationTeamId = typeof request.data?.revelationTeamId === 'string' ? request.data.revelationTeamId : null;

  const stats = listOf<PlayerStats>(
    await db.collection('playerStats').where('tournamentId', '==', tournamentId).orderBy('goals', 'desc').get(),
  );
  const topGoals = stats[0]?.goals ?? 0;
  const topScorers = new Set(stats.filter((s) => topGoals > 0 && s.goals === topGoals).map((s) => s.playerId));

  const longTerm = listOf<LongTermPrediction>(
    await db.collection('longTermPredictions').where('tournamentId', '==', tournamentId).get(),
  );
  const rules = tournament.longTermScoring;
  await commitInChunks(
    longTerm.flatMap((p) => {
      const points =
        (p.championTeamId === championTeamId ? rules.champion : 0) +
        (topScorers.has(p.topScorerPlayerId) ? rules.topScorer : 0) +
        (revelationTeamId && p.revelationTeamId === revelationTeamId ? rules.revelation : 0);
      const delta = points - (p.points ?? 0);
      return [
        (b) => b.update(db.doc(`longTermPredictions/${p.id}`), { points }),
        (b) =>
          b.set(
            db.doc(`leaderboard/${tournamentId}_${p.uid}`),
            { tournamentId, uid: p.uid, totalPoints: FieldValue.increment(delta), updatedAt: Date.now() },
            { merge: true },
          ),
      ] satisfies Parameters<typeof commitInChunks>[0];
    }),
  );
  await recomputeRanks(tournamentId);

  const leaderboard = listOf<LeaderboardEntry>(await db.collection('leaderboard').where('tournamentId', '==', tournamentId).get());
  const rankOf = new Map(leaderboard.map((e) => [e.uid, e.totalPoints > 0 ? e.rank : null]));
  const editions = listOf<UserEdition>(
    await db.collectionGroup('editions').where('tournamentId', '==', tournamentId).get(),
  );
  const users = await Promise.all(editions.map((e) => db.doc(`users/${e.uid}`).get()));
  const linkedPlayers = await Promise.all(
    users.map((u) => (u.get('linkedPlayerId') ? db.doc(`players/${u.get('linkedPlayerId')}`).get() : Promise.resolve(null))),
  );
  const candidates = editions.map((e, i) => ({
    uid: e.uid,
    kaleoPoints: e.kaleoPoints,
    bolaoRank: rankOf.get(e.uid) ?? null,
    checkins: e.counters?.checkin ?? 0,
    exactScores: e.counters?.exact_score ?? 0,
    linkedTeamId: (linkedPlayers[i]?.get('teamId') as string | undefined) ?? null,
  }));
  const awards = computeMedals(candidates, tournament.medalRules ?? DEFAULT_MEDAL_RULES, championTeamId);
  const medalCounts: Record<MedalTier, number> = { bronze: 0, silver: 0, gold: 0, legendary: 0 };
  awards.forEach((a) => (medalCounts[a.tier] += 1));

  await commitInChunks(
    awards.flatMap((award) => {
      const edition = editions.find((e) => e.uid === award.uid)!;
      return [
        (b) =>
          b.set(
            db.doc(`users/${award.uid}/medals/${tournamentId}`),
            {
              tournamentId,
              tournamentName: tournament.name,
              season: tournament.season,
              tier: award.tier,
              variant: award.variant,
              distinctions: award.distinctions,
              serialNumber: edition.serialNumber,
              totalAwarded: awards.length,
              kaleoPoints: edition.kaleoPoints,
              artUrl: tournament.medalArt?.[award.tier] ?? null,
              revealedAt: null,
              awardedAt: Date.now(),
            },
            { merge: true },
          ),
        (b) =>
          b.update(db.doc(`users/${award.uid}/editions/${tournamentId}`), {
            bolaoFinalRank: rankOf.get(award.uid) ?? null,
          }),
      ] satisfies Parameters<typeof commitInChunks>[0];
    }),
  );

  const bolaoChampion = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints)[0];
  const decisive = matches
    .filter((m) => m.status === 'finished' && m.home && m.away)
    .sort((a, b) => Math.abs(b.score.home - b.score.away) - Math.abs(a.score.home - a.score.away))[0];
  const mvpTally = tournament.mvpTally ?? {};
  const bestId = Object.entries(mvpTally).sort((a, b) => b[1] - a[1])[0]?.[0];
  const best = bestId ? stats.find((s) => s.playerId === bestId) : undefined;
  const checkins = await db.collection('checkins').where('tournamentId', '==', tournamentId).count().get();
  const hall: Omit<HallOfFameEdition, 'id'> = {
    edition: tournament.edition,
    season: tournament.season,
    name: tournament.name,
    championTeam: winner,
    runnerUpTeam: second,
    topScorer: stats[0] && topGoals > 0 ? { name: stats[0].name, teamName: stats[0].teamName, goals: topGoals } : null,
    bestPlayer: best ? { name: best.name, teamName: best.teamName } : null,
    biggestWin: decisive
      ? `${decisive.home!.name} ${decisive.score.home} x ${decisive.score.away} ${decisive.away!.name}`
      : null,
    bolaoChampion: bolaoChampion ? { displayName: bolaoChampion.displayName, points: bolaoChampion.totalPoints } : null,
    medalCounts,
    totalFans: editions.length,
    totalCheckins: checkins.data().count,
  };
  await db.doc(`hallOfFame/${tournamentId}`).set(hall);
  await db.doc(`tournaments/${tournamentId}`).update({
    phase: 'post',
    status: 'finished',
    championTeamId: championTeamId ?? null,
    revelationTeamId: revelationTeamId ?? null,
  });
  return { medals: awards.length, medalCounts, teams: teams.length };
});

export const shiftSchedule = onCall(async (request) => {
  requireMesario(request);
  const tournamentId = str(request.data?.tournamentId, 'tournamentId');
  const minutes = Number(request.data?.minutes);
  if (!Number.isFinite(minutes) || Math.abs(minutes) > 240) throw new HttpsError('invalid-argument', 'Minutos inválidos.');
  const { matches } = await loadTournamentState(tournamentId);
  const pending = matches.filter((m) => m.status === 'scheduled');
  await commitInChunks(
    pending.map((m) => (b) => b.update(db.doc(`matches/${m.id}`), { kickoffAt: m.kickoffAt + minutes * 60_000 })),
  );
  return { shifted: pending.length };
});
