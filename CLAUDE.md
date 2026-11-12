# Copa Kaleo 2.0

Portal do torneio Copa Kaleo, migrando de landing page estática (`public/index.html`) para uma plataforma React + Firebase. Projeto desenvolvido por **duas pessoas**, cada uma com o seu Claude.

## Início de toda sessão (obrigatório)
1. `git fetch` e confira a branch atual com `git status`. Se houver commits novos na `origin/hmg`, avise e traga-os (`git pull` na `hmg`, ou `git merge origin/hmg` numa branch de tarefa) antes de editar qualquer coisa.
2. Leia [docs/STATUS.md](docs/STATUS.md): onde paramos, próximos passos, problemas conhecidos e quem está mexendo em quê. Não pegue uma tarefa que o outro colaborador marcou.
3. Nunca commite direto na `main` (produção) nem na `hmg` (homologação). Para uma tarefa nova, crie `feat/<ID>-assunto` ou `fix/<assunto>` a partir da `hmg` atualizada.

## Antes de alterar QUALQUER coisa (obrigatório, toda vez)
Não basta conferir no início da sessão: o outro colaborador (Bruno ou Kaio) pode ter publicado algo há poucos minutos. Confira commits, branches novas e PRs (`gh pr list --repo BTFreitass/Copa-Kaleo2`). **Antes de cada alteração** (editar arquivo, commit, push, merge, deploy ou mudança no Firebase/console), rode:
```bash
git fetch --all --prune
git status -sb
git log --oneline HEAD..origin/hmg
git log --oneline HEAD..origin/<sua-branch>
```
- Se aparecer algum commit novo: **pare**, avise o usuário do que chegou (autor e mensagem), traga as mudanças (`git pull` ou `git merge origin/hmg`) e releia o [docs/STATUS.md](docs/STATUS.md) antes de continuar.
- Se o STATUS.md mostrar que o outro colaborador está mexendo nos mesmos arquivos ou na mesma área, não altere: avise o usuário e combine antes.
- Se a sua branch e a remota divergirem, nunca use `push --force`. Faça merge e resolva os conflitos.

## Registro contínuo (obrigatório, vale para os dois colaboradores)
O outro colaborador e o Claude dele dependem do [docs/STATUS.md](docs/STATUS.md) para saber o que está acontecendo. Registre **na hora**, não só no fim da sessão:

| Quando acontecer... | Registre em STATUS.md |
|---|---|
| Começar uma tarefa | Linha em "Quem está mexendo em quê" (commit e push logo, antes de codificar) |
| Abrir, fazer merge ou fechar um PR | Tabela "Pull Requests abertos" |
| Qualquer mudança no Firebase real (`copakaleo`) ou no site oficial: deploy, regras, segredos, configurações no console, dados | Linha no topo do "Registro de produção", **com como desfazer** |
| Decisão de escopo, arquitetura ou de produto | "Decisões registradas" no [docs/BACKLOG.md](docs/BACKLOG.md) |
| Bug ou limitação encontrada e não resolvida | "Problemas conhecidos" |
| Mudança no que vem a seguir | "Próximos passos" e "Estado atual" |

Regras do registro:
- Identifique quem fez: use o nome de `git config user.name` (ou pergunte ao usuário na primeira sessão) e escreva "Nome (Claude)" quando foi o Claude que executou.
- Faça commit das atualizações do STATUS.md junto com o trabalho, na mesma branch e no mesmo PR.
- **Nunca** escreva senhas, chaves secretas, tokens ou dados pessoais no STATUS.md, no BACKLOG.md ou em commits. Registre só que a mudança aconteceu e com quem a informação ficou.
- Se encontrar no STATUS.md algo desatualizado (PR já mesclado, tarefa terminada), corrija.

## Fim de toda sessão (obrigatório)
- Entrada nova no topo do "Diário" do [docs/STATUS.md](docs/STATUS.md): o que mudou, o que ficou pela metade, o que o próximo precisa saber. Atualize também "Última atualização".
- Atualize o status da tarefa em [docs/BACKLOG.md](docs/BACKLOG.md).
- Rode `npm run typecheck` e `npm test` antes de sugerir o Pull Request (sempre para a `hmg`).
- Antes de encerrar, confira que nada ficou só na sua máquina: commit e push do que foi feito, inclusive do STATUS.md.

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
