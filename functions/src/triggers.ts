import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import {
  PACK_GRANTS,
  unlockedAchievements,
  type Activity,
  type Match,
  type MatchEvent,
  type Prediction,
  type UserEdition,
} from './types';
import {
  FieldValue,
  db,
  ensureLeaderboardEntry,
  getTournament,
  kaleoPointsFor,
  listOf,
  logger,
  notifyTopic,
  recordActivity,
  withId,
} from './core';
import {
  advanceBracket,
  computeCrowdStats,
  notifyPredictionsOpen,
  recomputePlayerStats,
  recomputeRanks,
  scoreChanged,
  scoreMatch,
  updateDuels,
} from './results';

export const onMatchUpdated = onDocumentUpdated('matches/{matchId}', async (event) => {
  const before = event.data?.before.data() as Match | undefined;
  const afterSnap = event.data?.after;
  if (!before || !afterSnap) return;
  const after = withId<Match>(afterSnap);

  if (before.status === 'scheduled' && after.status !== 'scheduled') {
    await computeCrowdStats(after);
    if (after.status === 'live' && after.home && after.away) {
      await notifyTopic('all', `Começou: ${after.home.shortName} x ${after.away.shortName}`, 'Acompanhe ao vivo!', '/ao-vivo');
    }
  }

  const finishedNow = after.status === 'finished' && (before.status !== 'finished' || scoreChanged(before, after));
  const mvpChanged = after.mvp?.playerId !== before.mvp?.playerId;

  if (finishedNow) {
    await scoreMatch(after);
    await advanceBracket(after.tournamentId);
    await Promise.all([recomputeRanks(after.tournamentId), updateDuels(after.tournamentId), recomputePlayerStats(after.tournamentId)]);
    if (after.home && after.away) {
      await notifyTopic(
        'all',
        `Fim de jogo: ${after.home.shortName} ${after.score.home} x ${after.score.away} ${after.away.shortName}`,
        'Vote no Craque do Jogo nos próximos 10 minutos!',
        `/jogos/${after.id}`,
      );
    }
  } else if (mvpChanged && after.status === 'finished') {
    await recomputePlayerStats(after.tournamentId);
  }

  const teamsJustSet = (!before.homeTeamId || !before.awayTeamId) && after.homeTeamId && after.awayTeamId;
  if (teamsJustSet) await notifyPredictionsOpen(after);
});

export const onMatchEventWritten = onDocumentWritten('matches/{matchId}/events/{eventId}', async (event) => {
  const data = (event.data?.after.data() ?? event.data?.before.data()) as MatchEvent | undefined;
  const match = await db.doc(`matches/${event.params.matchId}`).get();
  if (!data || !match.exists) return;
  await recomputePlayerStats(match.get('tournamentId') as string);
  if (event.data?.before.exists || data.voided) return;
  if ((data.type === 'goal' || data.type === 'penalty_goal') && data.teamId) {
    await notifyTopic(`team_${data.teamId}`, `GOOOL! ${data.playerName ?? ''}`, `${data.minute}' — acompanhe ao vivo`, '/ao-vivo');
  }
});

export const onPredictionWritten = onDocumentWritten('predictions/{predictionId}', async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const prediction = withId<Prediction>(after);
  const created = !event.data?.before.exists;
  if (created) {
    const ref = await ensureLeaderboardEntry(prediction.tournamentId, prediction.uid);
    await ref.update({ predictionsCount: FieldValue.increment(1) });
    await recordActivity(prediction.uid, prediction.tournamentId, 'prediction', prediction.matchId);
  }
  if (prediction.isJoker) {
    const tournament = await getTournament(prediction.tournamentId);
    const bucket = prediction.stage === 'group' ? 'group' : 'knockout';
    const limit = tournament.jokerLimits?.[bucket] ?? 1;
    const jokers = listOf<Prediction>(
      await db
        .collection('predictions')
        .where('tournamentId', '==', prediction.tournamentId)
        .where('uid', '==', prediction.uid)
        .where('isJoker', '==', true)
        .get(),
    ).filter((p) => (p.stage === 'group' ? 'group' : 'knockout') === bucket);
    if (jokers.length > limit) {
      const keep = new Set(jokers.sort((a, b) => a.updatedAt - b.updatedAt).slice(0, limit).map((p) => p.id));
      if (!keep.has(prediction.id)) await after.ref.update({ isJoker: false });
    }
  }
});

export const onActivityCreated = onDocumentCreated('activity/{activityId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const activity = snap.data() as Activity;
  const tournament = await getTournament(activity.tournamentId);
  const points = kaleoPointsFor(tournament, activity.type);
  const editionRef = db.doc(`users/${activity.uid}/editions/${activity.tournamentId}`);
  const tournamentRef = db.doc(`tournaments/${activity.tournamentId}`);

  const isNew = await db.runTransaction(async (tx) => {
    const [edition, t] = await Promise.all([tx.get(editionRef), tx.get(tournamentRef)]);
    if (!edition.exists) {
      const serialNumber = ((t.get('participantCount') as number | undefined) ?? 0) + 1;
      tx.update(tournamentRef, { participantCount: serialNumber });
      tx.set(editionRef, {
        tournamentId: activity.tournamentId,
        uid: activity.uid,
        joinedAt: Date.now(),
        serialNumber,
        kaleoPoints: points,
        counters: { [activity.type]: 1 },
      });
      return true;
    }
    tx.update(editionRef, {
      kaleoPoints: FieldValue.increment(points),
      [`counters.${activity.type}`]: FieldValue.increment(1),
    });
    return false;
  });

  const packs = PACK_GRANTS[activity.type] ?? 0;
  if (packs > 0) {
    const batch = db.batch();
    for (let i = 0; i < packs; i += 1) {
      batch.set(db.collection(`users/${activity.uid}/packs`).doc(), {
        tournamentId: activity.tournamentId,
        source: activity.type,
        opened: false,
        createdAt: Date.now(),
      });
    }
    await batch.commit();
  }

  if (isNew && activity.type !== 'welcome') await recordActivity(activity.uid, activity.tournamentId, 'welcome', 'edition');

  const [edition, unlocked] = await Promise.all([
    editionRef.get().then((s) => withId<UserEdition>(s)),
    db.collection(`users/${activity.uid}/achievements`).where('tournamentId', '==', activity.tournamentId).get(),
  ]);
  const already = new Set(unlocked.docs.map((d) => d.get('achievementId') as string));
  for (const achievementId of unlockedAchievements(edition.counters ?? {}, already)) {
    await db.doc(`users/${activity.uid}/achievements/${activity.tournamentId}_${achievementId}`).set({
      achievementId,
      tournamentId: activity.tournamentId,
      unlockedAt: Date.now(),
    });
    await recordActivity(activity.uid, activity.tournamentId, 'achievement', achievementId);
    logger.info(`Conquista ${achievementId} para ${activity.uid}`);
  }
});

export const onMatchMvpVote = onDocumentCreated('matches/{matchId}/mvpVotes/{uid}', async (event) => {
  const playerId = event.data?.get('playerId') as string | undefined;
  if (!playerId) return;
  const matchRef = db.doc(`matches/${event.params.matchId}`);
  const tournamentId = await db.runTransaction(async (tx) => {
    const match = await tx.get(matchRef);
    const tally = { ...((match.get('mvpTally') as Record<string, number> | undefined) ?? {}) };
    tally[playerId] = (tally[playerId] ?? 0) + 1;
    const [leaderId] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0] ?? [];
    const update: Record<string, unknown> = { mvpTally: tally };
    if (leaderId && leaderId !== match.get('mvp.playerId')) {
      const player = await tx.get(db.doc(`players/${leaderId}`));
      update.mvp = { playerId: leaderId, playerName: player.get('name') ?? '' };
    }
    tx.update(matchRef, update);
    return match.get('tournamentId') as string;
  });
  await recordActivity(event.params.uid, tournamentId, 'mvp_vote', event.params.matchId);
});

export const onTournamentMvpVote = onDocumentCreated('tournaments/{tid}/mvpVotes/{uid}', async (event) => {
  const playerId = event.data?.get('playerId') as string | undefined;
  if (!playerId) return;
  await db.doc(`tournaments/${event.params.tid}`).update({ [`mvpTally.${playerId}`]: FieldValue.increment(1) });
  await recordActivity(event.params.uid, event.params.tid, 'mvp_vote', 'craque_da_copa');
});

export const onWallMessageCreated = onDocumentCreated('wallMessages/{id}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await recordActivity(data.uid as string, data.tournamentId as string, 'wall_message', event.params.id);
});
