import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { STAGE_LABEL, activeEvents, buildMatchReport, slugify, type Match, type MatchEvent } from './types';
import { db, listOf, logger, requireAdmin, withId } from './core';

const anthropicKey = defineSecret('ANTHROPIC_API_KEY');

const DraftSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  content: z.string(),
});

const SYSTEM = `Você é o redator do portal da Copa Kaleo, um torneio amador de futebol disputado em um único dia.
Escreva crônicas pós-jogo em português do Brasil, com tom animado, próximo e respeitoso, como um blog esportivo de comunidade.
Use somente os fatos fornecidos: não invente lances, falas, estatísticas ou nomes. Quando um dado não existir, não o mencione.
O campo content é Markdown: 3 a 5 parágrafos curtos e, se houver gols, uma seção "## Gols" em lista.
O title tem no máximo 80 caracteres e o excerpt no máximo 160.`;

export const generateMatchDraft = onCall({ secrets: [anthropicKey], timeoutSeconds: 120 }, async (request) => {
  const user = requireAdmin(request);
  const matchId = typeof request.data?.matchId === 'string' ? request.data.matchId : '';
  const matchSnap = await db.doc(`matches/${matchId}`).get();
  if (!matchSnap.exists) throw new HttpsError('not-found', 'Jogo não encontrado.');
  const match = withId<Match>(matchSnap);
  if (match.status !== 'finished') throw new HttpsError('failed-precondition', 'O jogo ainda não terminou.');
  const events = activeEvents(listOf<MatchEvent>(await db.collection(`matches/${matchId}/events`).get()));

  const fallback = buildMatchReport(match, events);
  let draft = fallback;
  let source: 'ai_draft' | 'template' = 'template';

  const apiKey = anthropicKey.value();
  if (apiKey) {
    try {
      draft = await writeWithClaude(apiKey, match, events);
      source = 'ai_draft';
    } catch (error) {
      logger.warn('Rascunho por IA indisponível, usando modelo automático', error);
    }
  }

  const ref = db.collection('posts').doc();
  const teamIds = [match.homeTeamId, match.awayTeamId].filter((id): id is string => Boolean(id));
  await ref.set({
    tournamentId: match.tournamentId,
    title: draft.title,
    slug: `${slugify(draft.title)}-${ref.id.slice(0, 5).toLowerCase()}`,
    excerpt: draft.excerpt,
    content: draft.content,
    coverImageUrl: '',
    category: 'pos_jogo',
    teamIds,
    matchId,
    authorId: user.uid,
    authorName: 'Redação Copa Kaleo',
    source: 'ai_draft',
    status: 'draft',
    publishedAt: null,
    updatedAt: Date.now(),
  });
  return { postId: ref.id, usedAi: source === 'ai_draft' };
});

async function writeWithClaude(apiKey: string, match: Match, events: MatchEvent[]) {
  const client = new Anthropic({ apiKey });
  const facts = {
    fase: STAGE_LABEL[match.stage],
    grupo: match.group,
    mandante: match.home?.name,
    visitante: match.away?.name,
    placar: `${match.score.home} x ${match.score.away}`,
    penaltis: match.penalties ? `${match.penalties.home} x ${match.penalties.away}` : null,
    craqueDoJogo: match.mvp?.playerName ?? null,
    palpitesDaTorcida: match.crowdStats ?? null,
    lances: events.map((e) => ({
      minuto: e.minute,
      tipo: e.type,
      time: e.teamId === match.homeTeamId ? match.home?.name : match.away?.name,
      jogador: e.playerName ?? null,
      assistencia: e.assistPlayerName ?? null,
      nota: e.text ?? null,
    })),
  };
  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(DraftSchema) },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Escreva a crônica pós-jogo com base nestes dados da súmula:\n\n${JSON.stringify(facts, null, 2)}`,
      },
    ],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) throw new Error(`Sem rascunho: ${response.stop_reason}`);
  return response.parsed_output;
}
