import { PASSWORD, TOURNAMENT_ID, auth, call, db, idToken, seeded, sleep } from './emulator';
import {
  DEFAULT_JOKER_LIMITS,
  DEFAULT_KALEO_POINTS,
  DEFAULT_LONG_TERM_SCORING,
  DEFAULT_MEDAL_RULES,
  DEFAULT_SCORING,
  buildTournament,
  slugify,
  type Position,
  type Tournament,
  type TournamentFormat,
} from '@copa/shared';

const random = seeded(2027);

const TEAMS = [
  ['Leões de Judá', 'LEO', '#d97706', '#1f2937'],
  ['Águias', 'AGU', '#2563eb', '#f8fafc'],
  ['Tubarões', 'TUB', '#0891b2', '#0f172a'],
  ['Falcões', 'FAL', '#7c3aed', '#fde047'],
  ['Lobos', 'LOB', '#475569', '#e2e8f0'],
  ['Panteras', 'PAN', '#db2777', '#111827'],
  ['Touros', 'TOU', '#dc2626', '#fafafa'],
  ['Dragões', 'DRA', '#16a34a', '#0a0a0a'],
] as const;

const FIRST = ['Lucas', 'Mateus', 'Pedro', 'João', 'Gabriel', 'Davi', 'Samuel', 'Rafael', 'Tiago', 'André', 'Felipe', 'Daniel', 'Caio', 'Enzo', 'Arthur', 'Miguel', 'Levi', 'Natan', 'Elias', 'Josué'];
const LAST = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Lima', 'Costa', 'Pereira', 'Almeida', 'Rocha', 'Ribeiro', 'Martins', 'Barbosa', 'Moura', 'Teixeira'];
const POSITIONS: Position[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'];
const FANS = ['Ana Paula', 'Bruna', 'Carlos', 'Débora', 'Eduardo', 'Fernanda', 'Gustavo', 'Helena', 'Isaque', 'Júlia', 'Kelly', 'Marcos'];

const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;

async function clear() {
  for (const name of ['settings', 'tournaments', 'teams', 'players', 'matches', 'posts', 'predictions', 'longTermPredictions', 'leaderboard', 'activity', 'leagues', 'duels', 'checkins', 'wallMessages', 'playerStats', 'stickers', 'trades', 'coupons', 'registrations', 'hallOfFame', 'videos', 'albums', 'users']) {
    await db.recursiveDelete(db.collection(name));
  }
  const users = await auth.listUsers(1000);
  if (users.users.length) await auth.deleteUsers(users.users.map((u) => u.uid));
}

async function createUser(email: string, displayName: string, claims?: Record<string, boolean>) {
  const user = await auth.createUser({ email, password: PASSWORD, displayName });
  if (claims) await auth.setCustomUserClaims(user.uid, claims);
  await db.doc(`users/${user.uid}`).set({ displayName, photoURL: null, isGuest: false, createdAt: Date.now() });
  return user.uid;
}

async function main() {
  console.log('🧹 Limpando emuladores...');
  await clear();

  const now = new Date();
  const start = new Date(now.getTime() + 20 * 60_000);
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5);
  const eventDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  const format: TournamentFormat = {
    teamCount: TEAMS.length,
    groupCount: 2,
    advancePerGroup: 2,
    thirdPlaceMatch: true,
    matchDurationMin: 30,
    breakBetweenMatchesMin: 10,
    dayStartsAt: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
  };

  console.log('👤 Criando usuários (senha de todos: kaleo123)...');
  const adminUid = await createUser('admin@copakaleo.dev', 'Organização Kaleo', { admin: true });
  await createUser('mesario@copakaleo.dev', 'Mesário Campo 1', { mesario: true });
  const fans: string[] = [];
  for (const [i, name] of FANS.entries()) fans.push(await createUser(`torcedor${i + 1}@copakaleo.dev`, name));

  console.log('⚙️  Configurações do site e da edição...');
  await db.doc('settings/site').set({
    activeTournamentId: TOURNAMENT_ID,
    liveStream: { active: false, platform: 'youtube', channelOrVideoId: '' },
    sponsors: Array.from({ length: 9 }, (_, i) => ({ name: `Patrocinador ${43 + i}`, logoUrl: `/img/${43 + i}.png`, order: i + 1 })),
  });

  const teamIds: string[] = [];
  for (const [name, short, primary, secondary] of TEAMS) {
    const ref = db.collection('teams').doc(slugify(name));
    teamIds.push(ref.id);
    await ref.set({ tournamentId: TOURNAMENT_ID, name, slug: slugify(name), shortName: short, logoUrl: '', primaryColor: primary, secondaryColor: secondary, group: null });
  }

  const built = buildTournament(format, teamIds.map((id) => ({ id })), start.getTime());
  const tournament: Omit<Tournament, 'id'> = {
    name: 'Copa Kaleo 2027',
    season: 2027,
    edition: 5,
    phase: 'pre',
    status: 'upcoming',
    eventDate,
    format,
    firstKickoffAt: built.matches[0]!.kickoffAt,
    scoringRules: DEFAULT_SCORING,
    longTermScoring: DEFAULT_LONG_TERM_SCORING,
    kaleoPointsRules: DEFAULT_KALEO_POINTS,
    medalRules: { ...DEFAULT_MEDAL_RULES, legendaryTopBolao: 1 },
    medalArt: {},
    jokerLimits: DEFAULT_JOKER_LIMITS,
    participantCount: 0,
  };
  await db.doc(`tournaments/${TOURNAMENT_ID}`).set(tournament);

  console.log('⚽ Times, atletas e tabela...');
  const used = new Set<string>();
  for (const [t, teamId] of teamIds.entries()) {
    await db.doc(`teams/${teamId}`).update({ group: built.groups[teamId] ?? null });
    for (const [n, position] of POSITIONS.entries()) {
      let name = `${pick(FIRST)} ${pick(LAST)}`;
      while (used.has(name)) name = `${pick(FIRST)} ${pick(LAST)}`;
      used.add(name);
      await db.collection('players').doc(`${teamId}-${n + 1}`).set({ tournamentId: TOURNAMENT_ID, teamId, name, number: n === 0 ? 1 : n + 3 + t % 3, position });
    }
  }
  const team = (id: string | null) => {
    if (!id) return null;
    const [name, short, primary] = TEAMS[teamIds.indexOf(id)]!;
    return { id, name, shortName: short, logoUrl: '', primaryColor: primary };
  };
  for (const m of built.matches) {
    await db.collection('matches').doc(`m${String(m.order).padStart(2, '0')}-${m.code}`).set({
      tournamentId: TOURNAMENT_ID,
      code: m.code,
      stage: m.stage,
      group: m.group,
      order: m.order,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      home: team(m.homeTeamId),
      away: team(m.awayTeamId),
      ...(m.feedsFrom ? { feedsFrom: m.feedsFrom } : {}),
      kickoffAt: m.kickoffAt,
      status: 'scheduled',
      period: 1,
      clockStartedAt: null,
      score: { home: 0, away: 0 },
      penalties: null,
      finishedAt: null,
    });
  }

  console.log('📰 Notícias e cupom...');
  const posts = [
    ['Está chegando a Copa Kaleo 2027', 'comunicado', 'Oito times, um dia inteiro de futebol e muita resenha. Confira o que preparamos.', '## Um dia, oito times\n\nA Copa Kaleo 2027 acontece em **um único dia**, com fase de grupos, semifinais, disputa de 3º lugar e final.\n\n## Novidades\n\n- Bolão com ligas privadas e coringa\n- Álbum de figurinhas com trocas\n- Telão com mural da torcida\n- **Medalha da Copa** para todo mundo que participar'],
    ['Leões de Judá apostam na experiência', 'pre_jogo', 'Time de demonstração para testar a página de notícias.', 'Matéria de exemplo criada pelo script de seed.'],
    ['Bastidores: como funciona o Modo Mesário', 'bastidores', 'Cada lance registrado na beira do campo aparece na hora no site e no telão.', 'O mesário registra gols, cartões e substituições pelo celular, mesmo com internet ruim.'],
  ] as const;
  for (const [i, [title, category, excerpt, content]] of posts.entries()) {
    await db.collection('posts').add({
      tournamentId: TOURNAMENT_ID, title, slug: slugify(title), excerpt, content, coverImageUrl: '', category,
      teamIds: i === 1 ? [teamIds[0]] : [], authorId: adminUid, authorName: 'Redação Copa Kaleo', source: 'human',
      status: 'published', publishedAt: Date.now() - i * 3_600_000, updatedAt: Date.now(),
    });
  }
  const coupon = await db.collection('coupons').add({
    tournamentId: TOURNAMENT_ID, sponsorName: 'Patrocinador 43', sponsorLogoUrl: '/img/43.png', title: '10% de desconto',
    description: 'Válido na loja física', minKaleoPoints: 50, totalCodes: 5, redeemedCount: 0, validUntil: Date.now() + 30 * 86_400_000,
  });
  await db.doc(`coupons/${coupon.id}/private/codes`).set({ codes: ['KALEO-A1', 'KALEO-B2', 'KALEO-C3', 'KALEO-D4', 'KALEO-E5'] });

  console.log('🃏 Gerando álbum de figurinhas pela Function...');
  const adminToken = await idToken('admin@copakaleo.dev');
  const stickers = await call<{ total: number }>('syncStickers', { tournamentId: TOURNAMENT_ID }, adminToken);
  console.log(`   ${stickers.total} figurinhas`);

  console.log('🔭 Palpites de longo prazo dos torcedores...');
  for (const uid of fans) {
    await db.doc(`longTermPredictions/${TOURNAMENT_ID}_${uid}`).set({
      tournamentId: TOURNAMENT_ID, uid, championTeamId: pick(teamIds), topScorerPlayerId: `${pick(teamIds)}-${Math.ceil(random() * 7)}`, revelationTeamId: pick(teamIds), points: null,
    });
    await db.doc(`activity/long_term_prediction_${TOURNAMENT_ID}_${uid}`).set({ uid, tournamentId: TOURNAMENT_ID, type: 'long_term_prediction', refId: TOURNAMENT_ID, createdAt: Date.now() });
  }
  await sleep(1500);

  console.log(`\n✅ Pronto! ${TEAMS.length} times, ${built.matches.length} jogos a partir de ${format.dayStartsAt}.`);
  console.log('   Admin:    admin@copakaleo.dev / kaleo123');
  console.log('   Mesário:  mesario@copakaleo.dev / kaleo123');
  console.log('   Torcedor: torcedor1@copakaleo.dev / kaleo123 (até torcedor12)');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
