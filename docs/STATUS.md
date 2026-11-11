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
| Realtime Database | ⚠️ Regras **totalmente abertas** (`.read`/`.write: true`). Não alterado: o painel do site antigo troca o vídeo sem login e quebraria |
| Storage | Ativado em `us-east1` (cota gratuita de 5 GB; região não pode mudar). **Regras publicadas** em 2026-11-11 |
| Functions | Não publicadas. Secret Manager responde, o que indica faturamento ativo: confirmar no console se o plano é Blaze |
| Chaves | `ANTHROPIC_API_KEY` e VAPID **ainda não configuradas** (ver passos abaixo) |

## Próximos passos (em ordem)

1. **Teste manual no navegador** com `npm run emulators` + `npm run seed` + `npm run dev`. Passar por cada tela com as contas de demonstração e anotar os problemas aqui, na seção "Problemas conhecidos".
2. **Decidir o que fazer com o Realtime Database aberto.** Opções: (a) fechar tudo e manter só `transmissao` aberta até o site novo entrar no ar; (b) fechar tudo agora e aceitar que o painel antigo pare de trocar o vídeo. Depois, `firebase deploy --only database`.
3. **Confirmar o plano Blaze** no console. Depois de configurar a chave da Anthropic (passo 4), `firebase deploy --only functions`.
4. **Configurar as chaves** (cada pessoa com acesso ao projeto faz isso na própria máquina; nunca colar a chave no chat nem commitar):
   - Claude: `firebase functions:secrets:set ANTHROPIC_API_KEY` (o terminal pede a chave, criada em console.anthropic.com).
   - VAPID: Console → Configurações do projeto → Cloud Messaging → Certificados push da Web → Gerar. Colocar em `apps/web/.env.production` como `VITE_FIREBASE_VAPID_KEY=...` (é uma chave pública, pode ir para o repositório).
5. Ativar os métodos de login no console (Google, e-mail/senha, link, telefone, anônimo, Facebook).
6. Trocar a senha `CopaKaleo2026`, que está exposta no `public/index.html` do site antigo.
7. Reduzir o pacote do Firebase no site (hoje ~256 KB comprimido).

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
- Descoberto que o Realtime Database está aberto para qualquer um. Não mexido, aguardando decisão (passo 2).
- Storage ativado no console (us-east1, para usar a cota gratuita) e regras publicadas.
- Chaves ainda não configuradas: dependem da chave pessoal da Anthropic e da VAPID gerada no console.

### 2026-11-11 · Bruno
- Monorepo criado: `packages/shared` (domínio), `apps/web` (React), `functions` (Cloud Functions), `scripts` (seed e simulação).
- Simulação revelou e corrigiu 2 bugs: Functions subindo na região errada (`us-central1`) e ranking gravando a mesma posição para todos (closure capturando variável do loop em `recomputeRanks`).
- Fluxo de branches definido: `main` = produção, `hmg` = homologação, `feat/*` para tarefas. Ver `docs/COLABORACAO.md`.
