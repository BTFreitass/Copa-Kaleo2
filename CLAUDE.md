# Copa Kaleo 2.0

Portal do torneio Copa Kaleo, migrando de landing page estática (`public/index.html`) para uma plataforma React + Firebase. Projeto desenvolvido por **duas pessoas**, cada uma com o seu Claude.

## Início de toda sessão (obrigatório)
1. `git fetch` e confira a branch atual com `git status`. Se houver commits novos na `origin/hmg`, avise e traga-os (`git pull` na `hmg`, ou `git merge origin/hmg` numa branch de tarefa) antes de editar qualquer coisa.
2. Leia [docs/STATUS.md](docs/STATUS.md): onde paramos, próximos passos, problemas conhecidos e quem está mexendo em quê. Não pegue uma tarefa que o outro colaborador marcou.
3. Nunca commite direto na `main` (produção) nem na `hmg` (homologação). Para uma tarefa nova, crie `feat/<ID>-assunto` ou `fix/<assunto>` a partir da `hmg` atualizada.

## Fim de toda sessão (obrigatório)
- Atualize [docs/STATUS.md](docs/STATUS.md): entrada nova no topo do "Diário", tabela "Quem está mexendo em quê", próximos passos e problemas conhecidos.
- Atualize o status da tarefa em [docs/BACKLOG.md](docs/BACKLOG.md).
- Rode `npm run typecheck` e `npm test` antes de sugerir o Pull Request (sempre para a `hmg`).

O fluxo completo para humanos está em [docs/COLABORACAO.md](docs/COLABORACAO.md).

## Documentação
- [docs/BACKLOG.md](docs/BACKLOG.md): funcionalidades com IDs (M1–M6, F01–F25), sprints, decisões e perguntas em aberto
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md): stack, estrutura de pastas e rotas
- [docs/MODELAGEM.md](docs/MODELAGEM.md): coleções do Firestore, Functions e índices

## Estrutura
- `packages/shared` — tipos e regras de domínio puras (pontuação, classificação, chaveamento, montador, medalhas, figurinhas). Testes em `domain.test.ts`.
- `apps/web` — site React (Vite + React Router + Tailwind). Features em `src/features/*`.
- `functions` — Cloud Functions v2 (empacotadas com esbuild em `lib/index.js`).
- `scripts/seed.ts` e `scripts/simulate.ts` — dados de demonstração e simulação do Dia da Copa nos emuladores.
- `public/` — site antigo (estático). O hosting agora publica `apps/web/dist`.

## Rodando localmente
```bash
npm install
npm run emulators          # terminal 1 — Auth, Firestore, RTDB, Storage, Functions (UI em :4000)
npm run seed               # terminal 2 — 8 times, 16 jogos, 12 torcedores, admin e mesário
npm run dev                # terminal 2 — site em http://localhost:5173
npm run simulate           # opcional — joga o torneio inteiro e confere ~30 comportamentos
npm test                   # testes de domínio
npm run typecheck
```
Contas de demonstração (senha `kaleo123`): `admin@copakaleo.dev`, `mesario@copakaleo.dev`, `torcedor1..12@copakaleo.dev`.

## Convenções
- TypeScript estrito, código modular por feature, **sem comentários no meio do código**.
- Commits e branches referenciam o ID: `feat(F17): modo mesário`.
- Ao concluir ou mudar algo do escopo, atualizar o status e as "Decisões registradas" em `docs/BACKLOG.md`.
- Lógica competitiva (pontos, check-in, figurinhas, medalhas) apenas em Cloud Functions.
