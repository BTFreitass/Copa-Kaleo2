import {
  DEFAULT_SCORING,
  SPECIAL_ACHIEVEMENTS,
  activeEvents,
  outcomeOf,
  resolveBracket,
  scorePrediction,
  type Duel,
  type LeaderboardEntry,
  type Match,
  type MatchEvent,
  type Player,
  type Prediction,
  type Sticker,
  type Team,
  type Tournament,
} from '@copa/shared';
import type { WriteBatch } from 'firebase-admin/firestore';
import { FieldValue, commitInChunks, db, getTournament, listOf, notifyTopic, recordActivity } from './core';

export async function scoreMatch(match: Match) {
  const tournament = await getTournament(match.tournamentId);
  const rules = tournament.scoringRules ?? DEFAULT_SCORING;
  const predictions = listOf<Prediction>(await db.collection('predictions').where('matchId', '==', match.id).get());
  const ops: ((b: WriteBatch) => void)[] = [];
  const activities: Promise<boolean>[] = [];

  for (const p of predictions) {
    const { points, result } = scorePrediction(p, match.score, rules);
    const exact = result === 'exact';
    const deltaPoints = points - (p.points ?? 0);
    const deltaExact = (exact ? 1 : 0) - (p.exact ? 1 : 0);
    ops.push((b) => b.update(db.doc(`predictions/${p.id}`), { points, exact }));
    if (deltaPoints !== 0 || deltaExact !== 0) {
      ops.push((b) =>
        b.set(
          db.doc(`leaderboard/${match.tournamentId}_${p.uid}`),
          {
            tournamentId: match.tournamentId,
            uid: p.uid,
            displayName: p.displayName,
            totalPoints: FieldValue.increment(deltaPoints),
            exactScores: FieldValue.increment(deltaExact),
            updatedAt: Date.now(),
          },
          { merge: true },
        ),
      );
    }
    if (exact) activities.push(recordActivity(p.uid, match.tournamentId, 'exact_score', match.id));
    else if (result !== 'miss') activities.push(recordActivity(p.uid, match.tournamentId, 'correct_winner', match.id));
  }
  await commitInChunks(ops);
  await Promise.all(activities);
}

export async function recomputeRanks(tournamentId: string) {
  const entries = listOf<LeaderboardEntry>(
    await db
      .collection('leaderboard')
      .where('tournamentId', '==', tournamentId)
      .orderBy('totalPoints', 'desc')
      .orderBy('exactScores', 'desc')
      .get(),
  );
  const ops: ((b: WriteBatch) => void)[] = [];
  let rank = 0;
  let previous: LeaderboardEntry | null = null;
  entries.forEach((entry, index) => {
    if (!previous || previous.totalPoints !== entry.totalPoints || previous.exactScores !== entry.exactScores) rank = index + 1;
    previous = entry;
    const position = rank;
    const bestRank = entry.bestRank > 0 ? Math.min(entry.bestRank, position) : position;
    if (entry.rank !== position || entry.bestRank !== bestRank) {
      ops.push((b) => b.update(db.doc(`leaderboard/${entry.id}`), { rank: position, bestRank }));
    }
  });
  await commitInChunks(ops);
  const leaders = entries.filter((e, i) => e.totalPoints > 0 && (i === 0 || e.totalPoints === entries[0]?.totalPoints));
  await Promise.all(leaders.map((l) => grantSpecialAchievement(l.uid, tournamentId, 'lider')));
}

export async function grantSpecialAchievement(uid: string, tournamentId: string, achievementId: string) {
  if (!SPECIAL_ACHIEVEMENTS.some((a) => a.id === achievementId)) return;
  const ref = db.doc(`users/${uid}/achievements/${tournamentId}_${achievementId}`);
  try {
    await ref.create({ achievementId, tournamentId, unlockedAt: Date.now() });
    await recordActivity(uid, tournamentId, 'achievement', achievementId);
  } catch (error) {
    if ((error as { code?: number }).code !== 6) throw error;
  }
}

export async function loadTournamentState(tournamentId: string) {
  const [teams, matches] = await Promise.all([
    db.collection('teams').where('tournamentId', '==', tournamentId).get(),
    db.collection('matches').where('tournamentId', '==', tournamentId).get(),
  ]);
  return { teams: listOf<Team>(teams), matches: listOf<Match>(matches).sort((a, b) => a.order - b.order) };
}

export async function advanceBracket(tournamentId: string) {
  const { teams, matches } = await loadTournamentState(tournamentId);
  const assignments = resolveBracket(teams, matches);
  if (assignments.length === 0) return;
  const batch = db.batch();
  const touched = new Set<string>();
  for (const a of assignments) {
    const snapshot = { id: a.team.id, name: a.team.name, shortName: a.team.shortName, logoUrl: a.team.logoUrl, primaryColor: a.team.primaryColor };
    batch.update(db.doc(`matches/${a.matchId}`), {
      [`${a.side}TeamId`]: a.team.id,
      [a.side]: snapshot,
    });
    touched.add(a.matchId);
  }
  const hasKnockoutTeams = matches.some((m) => m.stage !== 'group' && (m.homeTeamId || touched.has(m.id)));
  if (hasKnockoutTeams) batch.update(db.doc(`tournaments/${tournamentId}`), { status: 'knockout' });
  await batch.commit();
}

export async function computeCrowdStats(match: Match) {
  const predictions = listOf<Prediction>(await db.collection('predictions').where('matchId', '==', match.id).get());
  if (predictions.length === 0) return;
  const counts = { H: 0, D: 0, A: 0 };
  const scores = new Map<string, number>();
  for (const p of predictions) {
    counts[outcomeOf(p)] += 1;
    const key = `${p.home}x${p.away}`;
    scores.set(key, (scores.get(key) ?? 0) + 1);
  }
  const total = predictions.length;
  const topScore = [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  await db.doc(`matches/${match.id}`).update({
    crowdStats: {
      homePct: Math.round((counts.H / total) * 100),
      drawPct: Math.round((counts.D / total) * 100),
      awayPct: Math.round((counts.A / total) * 100),
      topScore,
      total,
    },
  });
}

export async function recomputePlayerStats(tournamentId: string) {
  const [{ matches, teams }, players] = await Promise.all([
    loadTournamentState(tournamentId),
    db.collection('players').where('tournamentId', '==', tournamentId).get().then((s) => listOf<Player>(s)),
  ]);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const stats = new Map(
    players.map((p) => [p.id, { goals: 0, assists: 0, yellow: 0, red: 0, mvpCount: 0, name: p.name, teamId: p.teamId }]),
  );
  const hatTricks = new Set<string>();
  const played = matches.filter((m) => m.status !== 'scheduled');
  const eventLists = await Promise.all(
    played.map((m) => db.collection(`matches/${m.id}/events`).get().then((s) => activeEvents(listOf<MatchEvent>(s)))),
  );
  played.forEach((match, i) => {
    const goalsInMatch = new Map<string, number>();
    for (const e of eventLists[i] ?? []) {
      const s = e.playerId ? stats.get(e.playerId) : undefined;
      if (s && (e.type === 'goal' || e.type === 'penalty_goal')) {
        s.goals += 1;
        goalsInMatch.set(e.playerId!, (goalsInMatch.get(e.playerId!) ?? 0) + 1);
      }
      if (s && e.type === 'yellow') s.yellow += 1;
      if (s && e.type === 'red') s.red += 1;
      const assist = e.assistPlayerId ? stats.get(e.assistPlayerId) : undefined;
      if (assist && (e.type === 'goal' || e.type === 'penalty_goal')) assist.assists += 1;
    }
    goalsInMatch.forEach((count, playerId) => count >= 3 && hatTricks.add(playerId));
    const mvp = match.mvp ? stats.get(match.mvp.playerId) : undefined;
    if (mvp && match.status === 'finished') {
      mvp.mvpCount += 1;
      hatTricks.add(match.mvp!.playerId);
    }
  });
  await commitInChunks(
    [...stats.entries()].map(([playerId, s]) => (b: WriteBatch) =>
      b.set(db.doc(`playerStats/${tournamentId}_${playerId}`), {
        tournamentId,
        playerId,
        name: s.name,
        teamId: s.teamId,
        teamName: teamName.get(s.teamId) ?? '',
        goals: s.goals,
        assists: s.assists,
        yellow: s.yellow,
        red: s.red,
        mvpCount: s.mvpCount,
      }),
    ),
  );
  await ensureShinyStickers(tournamentId, [...hatTricks], players);
}

async function ensureShinyStickers(tournamentId: string, playerIds: string[], players: Player[]) {
  if (playerIds.length === 0) return;
  const existing = listOf<Sticker>(await db.collection('stickers').where('tournamentId', '==', tournamentId).get());
  if (existing.length === 0) return;
  const have = new Set(existing.filter((s) => s.kind === 'shiny').map((s) => s.playerId));
  let next = Math.max(...existing.map((s) => s.number)) + 1;
  const batch = db.batch();
  let count = 0;
  for (const id of playerIds) {
    const player = players.find((p) => p.id === id);
    if (!player || have.has(id)) continue;
    batch.set(db.doc(`stickers/${tournamentId}_shiny_${id}`), {
      tournamentId,
      number: next++,
      kind: 'shiny',
      name: `${player.name} ✨`,
      teamId: player.teamId,
      playerId: id,
      imageUrl: player.photoUrl ?? null,
      rarity: 'shiny',
    });
    count += 1;
  }
  if (count > 0) await batch.commit();
}

export async function updateDuels(tournamentId: string) {
  const duels = listOf<Duel>(
    await db.collection('duels').where('tournamentId', '==', tournamentId).where('status', '==', 'accepted').get(),
  );
  if (duels.length === 0) return;
  const { matches } = await loadTournamentState(tournamentId);
  for (const duel of duels) {
    const scoped = matches.filter((m) =>
      duel.scope === 'day' ? true : duel.scope === 'group' ? m.stage === 'group' : m.stage !== 'group',
    );
    const ids = new Set(scoped.map((m) => m.id));
    const sum = async (uid: string) => {
      const preds = listOf<Prediction>(
        await db.collection('predictions').where('tournamentId', '==', tournamentId).where('uid', '==', uid).get(),
      );
      return preds.filter((p) => ids.has(p.matchId)).reduce((t, p) => t + (p.points ?? 0), 0);
    };
    const [challengerPoints, opponentPoints] = await Promise.all([sum(duel.challengerUid), sum(duel.opponentUid)]);
    const done = scoped.length > 0 && scoped.every((m) => m.status === 'finished');
    const winnerUid =
      challengerPoints === opponentPoints ? null : challengerPoints > opponentPoints ? duel.challengerUid : duel.opponentUid;
    await db.doc(`duels/${duel.id}`).update({
      result: { challengerPoints, opponentPoints, winnerUid },
      ...(done ? { status: 'finished' } : {}),
    });
    if (done && winnerUid) await recordActivity(winnerUid, tournamentId, 'duel_win', duel.id);
  }
}

export async function notifyPredictionsOpen(match: Match) {
  if (!match.home || !match.away) return;
  const minutes = Math.max(0, Math.round((match.kickoffAt - Date.now()) / 60000));
  await notifyTopic(
    'all',
    `Palpites abertos: ${match.home.shortName} x ${match.away.shortName}`,
    minutes > 0 ? `Fecham em ${minutes} min. Corre!` : 'Fecham em instantes!',
    '/bolao',
  );
}

export function scoreChanged(before: Match, after: Match) {
  return (
    before.score.home !== after.score.home ||
    before.score.away !== after.score.away ||
    (before.penalties?.home ?? null) !== (after.penalties?.home ?? null) ||
    (before.penalties?.away ?? null) !== (after.penalties?.away ?? null)
  );
}

export type { Tournament };
