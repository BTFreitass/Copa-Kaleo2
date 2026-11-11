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
| Produção | Site no ar continua sendo o antigo (`public/index.html`). Homologação publicada em https://copakaleo--hmg-rkmyzien.web.app |
| Firestore (produção) | Existe, em `southamerica-east1`. **Regras e índices publicados** em 2026-11-11. Ainda sem dados |
| Realtime Database | **Regras publicadas** em 2026-11-11. Tudo fechado, exceto `transmissao/videoAtual`, que segue com escrita aberta (só texto até 40 caracteres) porque o painel do site antigo troca o vídeo sem login. Fechar de vez quando o site novo entrar no ar |
| Storage | Ativado em `us-east1` (cota gratuita de 5 GB; região não pode mudar). **Regras publicadas** em 2026-11-11 |
| Functions | **Não publicadas.** Projeto já tem faturamento ativo (segredos funcionam). Falta rodar `firebase.cmd deploy --only functions` |
| Chaves | `ANTHROPIC_API_KEY` configurada no Secret Manager. VAPID configurada em `apps/web/.env.production` |

## Próximos passos (em ordem)

1. **Publicar as Functions:** `firebase.cmd deploy --only functions` (no PowerShell, use `firebase.cmd` em vez de `firebase`).
2. **Teste manual no navegador** com `npm run emulators` + `npm run seed` + `npm run dev`. Passar por cada tela com as contas de demonstração e anotar os problemas aqui, na seção "Problemas conhecidos".
3. Ativar os métodos de login no console (Google, e-mail/senha com link, telefone, anônimo; Facebook depois).
4. Trocar a senha `CopaKaleo2026`, que está exposta no `public/index.html` do site antigo.
5. Quando o site novo substituir o antigo: remover a exceção de `transmissao/videoAtual` em `database.rules.json` e publicar com `firebase deploy --only database`.
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

### 2026-11-11 (tarde) · Bruno
- Regras e índices do Firestore publicados em produção (`firebase deploy --only firestore`).
- Realtime Database estava aberto para qualquer um ler e apagar. Fechado, mantendo só `transmissao/videoAtual` gravável para o site antigo não quebrar (decisão do Bruno: opção "a").
- Storage ativado no console (us-east1, para usar a cota gratuita) e regras publicadas.
- `ANTHROPIC_API_KEY` criada no Secret Manager e chave VAPID adicionada ao `.env.production`.
- Deploy das Functions ficou pendente: precisa de autorização explícita ou ser rodado manualmente.

### 2026-11-11 · Bruno
- Monorepo criado: `packages/shared` (domínio), `apps/web` (React), `functions` (Cloud Functions), `scripts` (seed e simulação).
- Simulação revelou e corrigiu 2 bugs: Functions subindo na região errada (`us-central1`) e ranking gravando a mesma posição para todos (closure capturando variável do loop em `recomputeRanks`).
- Fluxo de branches definido: `main` = produção, `hmg` = homologação, `feat/*` para tarefas. Ver `docs/COLABORACAO.md`.
