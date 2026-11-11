import type { Match, MatchEvent } from './types';
import { STAGE_LABEL } from './constants';

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateInviteCode(random: () => number = Math.random) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
}

export function extractYouTubeId(input: string): { id: string; start: number | null } | null {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return { id: value, start: null };
  const match = /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|live\/|shorts\/|watch\?v=|&v=)([\w-]{11})/.exec(value);
  if (!match?.[1]) return null;
  let start: number | null = null;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    const t = url.searchParams.get('t') ?? url.searchParams.get('start');
    if (t) start = parseInt(t, 10) || null;
  } catch {
    start = null;
  }
  return { id: match[1], start };
}

export function extractInstagramCode(input: string) {
  const match = /instagram\.com\/(?:reel|p|tv)\/([\w-]+)/.exec(input);
  return match?.[1] ?? (/^[\w-]{6,}$/.test(input.trim()) ? input.trim() : null);
}

export function isPredictionOpen(match: Pick<Match, 'status' | 'kickoffAt' | 'homeTeamId' | 'awayTeamId'>, now: number) {
  return match.status === 'scheduled' && now < match.kickoffAt && Boolean(match.homeTeamId && match.awayTeamId);
}

export function matchMinute(match: Pick<Match, 'status' | 'period' | 'clockStartedAt'>, halfMinutes: number, now: number) {
  if (match.status !== 'live' || !match.clockStartedAt) return null;
  const elapsed = Math.floor((now - match.clockStartedAt) / 60_000) + 1;
  const offset = match.period === 2 ? halfMinutes : 0;
  return Math.max(1, Math.min(elapsed, halfMinutes + 5)) + offset;
}

export function activeEvents(events: MatchEvent[]) {
  return events.filter((e) => !e.voided).sort((a, b) => a.createdAt - b.createdAt);
}

export function buildMatchReport(match: Match, events: MatchEvent[]) {
  const home = match.home?.name ?? 'Mandante';
  const away = match.away?.name ?? 'Visitante';
  const list = activeEvents(events);
  const goals = list.filter((e) => e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal');
  const cards = list.filter((e) => e.type === 'yellow' || e.type === 'red');
  const { home: h, away: a } = match.score;
  const headline =
    h === a
      ? `${home} e ${away} empatam em ${h} a ${a}`
      : h > a
        ? `${home} vence ${away} por ${h} a ${a}`
        : `${away} vence ${home} por ${a} a ${h}`;
  const teamName = (id?: string) => (id === match.homeTeamId ? home : id === match.awayTeamId ? away : '');
  const goalLines = goals.map((g) => {
    const kind = g.type === 'penalty_goal' ? ' (pênalti)' : g.type === 'own_goal' ? ' (contra)' : '';
    const assist = g.assistPlayerName ? `, com assistência de ${g.assistPlayerName}` : '';
    return `- **${g.minute}'** — ${g.playerName ?? 'Gol'}${kind} para o ${teamName(g.teamId)}${assist}`;
  });
  const cardLines = cards.map((c) => `- ${c.type === 'red' ? '🟥' : '🟨'} ${c.minute}' — ${c.playerName ?? ''} (${teamName(c.teamId)})`);
  const penalties = match.penalties ? `\n\nNos pênaltis, o placar terminou em ${match.penalties.home} a ${match.penalties.away}.` : '';
  const mvp = match.mvp ? `\n\nA torcida elegeu **${match.mvp.playerName}** como o Craque do Jogo.` : '';
  return {
    title: headline,
    excerpt: `${STAGE_LABEL[match.stage]}${match.group ? ` · Grupo ${match.group}` : ''}: confira como foi ${home} x ${away}.`,
    content: [
      `Pela ${STAGE_LABEL[match.stage].toLowerCase()}${match.group ? ` (Grupo ${match.group})` : ''}, ${headline.charAt(0).toLowerCase()}${headline.slice(1)}.${penalties}`,
      goalLines.length ? `## Gols\n\n${goalLines.join('\n')}` : '## Gols\n\nA partida terminou sem gols.',
      cardLines.length ? `## Cartões\n\n${cardLines.join('\n')}` : '',
      mvp.trim(),
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}
