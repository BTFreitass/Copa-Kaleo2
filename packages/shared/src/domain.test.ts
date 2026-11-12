import { describe, expect, it } from 'vitest';
import {
  clockPause,
  clockResume,
  clockSet,
  matchClock,
  matchMinute,
  parseClock,
  DEFAULT_MEDAL_RULES,
  DEFAULT_SCORING,
  bracketOrder,
  buildTournament,
  computeGroupStandings,
  computeMedals,
  extractYouTubeId,
  qualificationOdds,
  resolveBracket,
  scorePrediction,
  validateFormat,
  type Match,
  type TournamentFormat,
} from './index';

const format = (over: Partial<TournamentFormat> = {}): TournamentFormat => ({
  teamCount: 8,
  groupCount: 2,
  advancePerGroup: 2,
  thirdPlaceMatch: true,
  matchDurationMin: 30,
  breakBetweenMatchesMin: 10,
  dayStartsAt: '08:00',
  ...over,
});

const teams = Array.from({ length: 8 }, (_, i) => ({ id: `t${i + 1}` }));

describe('scorePrediction', () => {
  it('pontua placar exato, vencedor+saldo, vencedor e erro', () => {
    expect(scorePrediction({ home: 2, away: 1, isJoker: false }, { home: 2, away: 1 }, DEFAULT_SCORING).points).toBe(10);
    expect(scorePrediction({ home: 3, away: 2, isJoker: false }, { home: 2, away: 1 }, DEFAULT_SCORING).points).toBe(7);
    expect(scorePrediction({ home: 1, away: 0, isJoker: false }, { home: 3, away: 1 }, DEFAULT_SCORING).points).toBe(5);
    expect(scorePrediction({ home: 0, away: 1, isJoker: false }, { home: 3, away: 1 }, DEFAULT_SCORING).points).toBe(0);
    expect(scorePrediction({ home: 1, away: 1, isJoker: false }, { home: 2, away: 2 }, DEFAULT_SCORING).points).toBe(7);
  });

  it('coringa dobra os pontos', () => {
    expect(scorePrediction({ home: 2, away: 1, isJoker: true }, { home: 2, away: 1 }, DEFAULT_SCORING).points).toBe(20);
  });
});

describe('buildTournament', () => {
  it('gera 2 grupos de 4 com semis, 3º lugar e final', () => {
    const result = buildTournament(format(), teams, 0);
    const byStage = (s: string) => result.matches.filter((m) => m.stage === s);
    expect(byStage('group')).toHaveLength(12);
    expect(byStage('semi').map((m) => m.feedsFrom)).toEqual([
      { home: '1A', away: '2B' },
      { home: '1B', away: '2A' },
    ]);
    expect(byStage('third_place')).toHaveLength(1);
    expect(result.matches.at(-1)?.code).toBe('F');
    expect(result.matches).toHaveLength(16);
    expect(result.endsAt).toBe(15 * 40 * 60_000 + 30 * 60_000);
  });

  it('nenhum time joga duas vezes seguidas na fase de grupos com 2 grupos', () => {
    const groupMatches = buildTournament(format(), teams, 0).matches.filter((m) => m.stage === 'group');
    for (let i = 1; i < groupMatches.length; i += 1) {
      const prev = groupMatches[i - 1]!;
      const curr = groupMatches[i]!;
      expect([curr.homeTeamId, curr.awayTeamId]).not.toContain(prev.homeTeamId);
      expect([curr.homeTeamId, curr.awayTeamId]).not.toContain(prev.awayTeamId);
    }
  });

  it('mata-mata direto com 8 times', () => {
    const result = buildTournament(format({ groupCount: 0, thirdPlaceMatch: false }), teams, 0);
    expect(result.matches.filter((m) => m.stage === 'quarter')).toHaveLength(4);
    expect(result.matches[0]?.homeTeamId).toBe('t1');
    expect(result.matches[0]?.awayTeamId).toBe('t8');
    expect(result.matches).toHaveLength(7);
  });

  it('valida formatos impossíveis', () => {
    expect(validateFormat(format({ groupCount: 3, advancePerGroup: 2 }), 9)).toMatch(/2, 4, 8 ou 16/);
    expect(validateFormat(format({ groupCount: 0 }), 6)).toMatch(/2, 4, 8 ou 16/);
    expect(validateFormat(format(), 8)).toBeNull();
  });

  it('ordem de chaveamento separa os cabeças de chave', () => {
    expect(bracketOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

function toMatches(fmt: TournamentFormat): Match[] {
  const built = buildTournament(fmt, teams, 0);
  return built.matches.map((m, i) => ({
    ...m,
    id: `m${i}`,
    tournamentId: 't',
    home: m.homeTeamId ? snap(m.homeTeamId) : null,
    away: m.awayTeamId ? snap(m.awayTeamId) : null,
    status: 'scheduled',
    period: 1,
    clockStartedAt: null,
    score: { home: 0, away: 0 },
    penalties: null,
    finishedAt: null,
  }));
}

const snap = (id: string) => ({ id, name: id, shortName: id, logoUrl: '', primaryColor: '#000' });

describe('standings e chaveamento', () => {
  const built = buildTournament(format(), teams, 0);
  const groupTeams = teams.map((t) => ({ ...snap(t.id), group: built.groups[t.id] ?? null }));

  it('classifica e preenche as semifinais quando os grupos terminam', () => {
    const matches = toMatches(format());
    for (const m of matches.filter((x) => x.stage === 'group')) {
      m.status = 'finished';
      m.score = { home: Number(m.homeTeamId!.slice(1)) % 3, away: 0 };
    }
    const table = computeGroupStandings(groupTeams, matches);
    expect(Object.keys(table)).toEqual(['A', 'B']);
    expect(table.A).toHaveLength(4);
    const assignments = resolveBracket(groupTeams, matches);
    const semiIds = matches.filter((m) => m.stage === 'semi').map((m) => m.id);
    expect(assignments.filter((a) => semiIds.includes(a.matchId))).toHaveLength(4);
  });

  it('não preenche semis enquanto o grupo não termina', () => {
    const matches = toMatches(format());
    matches[0]!.status = 'finished';
    expect(resolveBracket(groupTeams, matches)).toHaveLength(0);
  });

  it('chance de classificação soma 100% por vaga', () => {
    const matches = toMatches(format());
    const odds = qualificationOdds(groupTeams, matches, 2, 500);
    const total = Object.values(odds).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(380);
    expect(total).toBeLessThan(420);
  });
});

describe('computeMedals', () => {
  it('atribui níveis e distinções', () => {
    const awards = computeMedals(
      [
        { uid: 'a', kaleoPoints: 1000, bolaoRank: 1, checkins: 8, exactScores: 4, linkedTeamId: null },
        { uid: 'b', kaleoPoints: 750, bolaoRank: 10, checkins: 2, exactScores: 1, linkedTeamId: 't1' },
        { uid: 'c', kaleoPoints: 450, bolaoRank: 20, checkins: 0, exactScores: 0, linkedTeamId: 't2' },
        { uid: 'd', kaleoPoints: 10, bolaoRank: null, checkins: 0, exactScores: 0, linkedTeamId: null },
      ],
      { ...DEFAULT_MEDAL_RULES, legendaryTopBolao: 1 },
      't1',
    );
    const by = Object.fromEntries(awards.map((a) => [a.uid, a]));
    expect(by.a?.tier).toBe('legendary');
    expect(by.a?.distinctions).toEqual(['bolao_champion', 'most_loyal', 'best_predictor']);
    expect(by.b?.tier).toBe('gold');
    expect(by.b?.variant).toBe('athlete_champion');
    expect(by.c?.tier).toBe('silver');
    expect(by.c?.variant).toBe('athlete');
    expect(by.d?.tier).toBe('bronze');
  });
});

describe('extractYouTubeId', () => {
  it('extrai id e tempo inicial', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=y8e9RoHuEHY&t=31814')).toEqual({ id: 'y8e9RoHuEHY', start: 31814 });
    expect(extractYouTubeId('https://youtu.be/y8e9RoHuEHY')).toEqual({ id: 'y8e9RoHuEHY', start: null });
    expect(extractYouTubeId('https://www.youtube.com/live/y8e9RoHuEHY?si=abc')?.id).toBe('y8e9RoHuEHY');
    expect(extractYouTubeId('nada')).toBeNull();
  });
});

describe('cronômetro da partida', () => {
  const base = { status: 'live' as const, period: 1 as const, clockStartedAt: 1_000_000, clockElapsedMs: 0, clockRunning: true };

  it('conta o tempo enquanto roda e congela quando pausa', () => {
    expect(matchClock(base, 15, 1_000_000 + 125_000).label).toBe('02:05');
    const paused = { ...base, ...clockPause(base, 1_000_000 + 125_000) };
    expect(paused.clockRunning).toBe(false);
    expect(matchClock(paused, 15, 9_999_999).label).toBe('02:05');
    const resumed = { ...paused, ...clockResume(paused, 2_000_000) };
    expect(matchClock(resumed, 15, 2_000_000 + 10_000).label).toBe('02:15');
  });

  it('o 2º tempo começa no meio do jogo e o minuto do lance acompanha', () => {
    const second = { ...base, period: 2 as const, ...clockSet(0, true, 5_000_000) };
    const clock = matchClock(second, 15, 5_000_000 + 61_000);
    expect(clock.label).toBe('16:01');
    expect(clock.minute).toBe(17);
  });

  it('ajuste manual e leitura de mm:ss', () => {
    expect(parseClock('12:30')).toBe(750_000);
    expect(parseClock('7')).toBe(420_000);
    expect(parseClock('abc')).toBeNull();
    const set = { ...base, ...clockSet(750_000, false, 3_000_000) };
    expect(matchClock(set, 15, 4_000_000).label).toBe('12:30');
  });

  it('jogos antigos sem os campos novos continuam funcionando', () => {
    const legacy = { status: 'live' as const, period: 1 as const, clockStartedAt: 1_000_000 };
    expect(matchMinute(legacy, 15, 1_000_000 + 30_000)).toBe(1);
    expect(matchMinute({ ...legacy, status: 'halftime' }, 15, 2_000_000)).toBeNull();
  });
});
