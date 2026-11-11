# Onde paramos

> Arquivo de passagem de bastão entre sessões e entre colaboradores.
> **Claude: leia este arquivo no início de toda sessão e atualize a seção "Diário" ao terminar.**
> Humanos: leiam antes de pegar uma tarefa, para não fazer em dobro.

**Última atualização:** 2026-11-11 · Bruno (com Claude)
**Branch de trabalho:** `hmg` · **Produção:** `main` (site antigo ainda no ar)

---

## Estado atual

| Área | Situação |
|---|---|
| Código | Primeira versão completa de **todas** as funcionalidades (M1–M6, F01–F25) |
| Tipagem / build | `npm run typecheck` e `npm run build` passam |
| Testes de domínio | `npm test`: 12/12 passando |
| Simulação ponta a ponta | `npm run simulate`: 27/27 verificações passando (regras de segurança, bolão, mata-mata, figurinhas, cupons, medalhas, Hall da Fama) |
| Testado no navegador | **Ainda não.** Ninguém clicou pelas telas com os emuladores rodando |
| Produção | Nada publicado. O site no ar continua sendo o antigo (`public/index.html`) |
| Firebase | Projeto `copakaleo` provavelmente no plano Spark. Functions exigem Blaze |

## Próximos passos (em ordem)

1. **Teste manual no navegador** com `npm run emulators` + `npm run seed` + `npm run dev`. Passar por cada tela com as contas de demonstração e anotar os problemas aqui, na seção "Problemas conhecidos".
2. **Decidir o plano Blaze** (ver `docs/BACKLOG.md` → Perguntas em aberto).
3. Criar o Firestore de produção na região **southamerica-east1** e ativar os métodos de login no console (Google, e-mail/senha, link, telefone, anônimo, Facebook).
4. Primeiro deploy em **homologação** (push na `hmg` publica no canal de preview `hmg`).
5. Trocar a senha `CopaKaleo2026`, que está exposta no `public/index.html` do site antigo, e revisar as regras do Realtime Database atual.
6. Reduzir o pacote do Firebase no site (hoje ~256 KB comprimido).

## Problemas conhecidos

- O "Craque do Jogo" só aparece depois que o primeiro voto chega (comportamento esperado, mas a tela pode explicar melhor).
- Notificações push (F23) não funcionam nos emuladores. Só dá para testar publicado, com a chave VAPID em `VITE_FIREBASE_VAPID_KEY`.
- O rascunho por IA (F11) precisa do segredo `ANTHROPIC_API_KEY` nas Functions. Sem ele, usa um modelo de texto fixo.
- Login por SMS exige Blaze. Login com Facebook exige criar o app no Meta for Developers.

## Quem está mexendo em quê

Antes de começar uma tarefa, escreva aqui e faça push, para o outro saber.

| Pessoa | Tarefa (ID do backlog) | Branch | Desde |
|---|---|---|---|
| — | — | — | — |

---

## Diário

Uma entrada por sessão de trabalho, a mais recente no topo. Curta: o que mudou, o que ficou pela metade, o que o próximo precisa saber.

### 2026-11-11 · Bruno
- Monorepo criado: `packages/shared` (domínio), `apps/web` (React), `functions` (Cloud Functions), `scripts` (seed e simulação).
- Simulação revelou e corrigiu 2 bugs: Functions subindo na região errada (`us-central1`) e ranking gravando a mesma posição para todos (closure capturando variável do loop em `recomputeRanks`).
- Fluxo de branches definido: `main` = produção, `hmg` = homologação, `feat/*` para tarefas. Ver `docs/COLABORACAO.md`.
