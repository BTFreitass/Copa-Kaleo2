# Onde paramos

> Arquivo de passagem de bastão entre sessões e entre colaboradores.
> **Claude: leia este arquivo inteiro no início de toda sessão e registre aqui cada ação relevante assim que ela acontecer** (regras em `CLAUDE.md` → "Registro contínuo").
> Humanos: leiam antes de pegar uma tarefa, para não fazer em dobro.
> **Nunca escreva senhas, chaves secretas ou tokens neste arquivo.**

**Última atualização:** 2026-11-11 · Bruno (com Claude)
**Branch de trabalho:** `hmg` · **Produção:** `main` (site antigo ainda no ar)

---

## Estado atual

| Área | Situação |
|---|---|
| Código | Primeira versão completa de **todas** as funcionalidades (M1–M6, F01–F25) na `hmg` |
| Tipagem / build | `npm run typecheck` e `npm run build` passam |
| Testes de domínio | `npm test`: 12/12 passando |
| Simulação ponta a ponta | `npm run simulate`: 27/27 verificações passando (regras de segurança, bolão, mata-mata, figurinhas, cupons, medalhas, Hall da Fama) |
| Testado no navegador | **Ainda não.** Ninguém clicou pelas telas com os emuladores rodando |
| Site oficial (`main`) | Site antigo (`public/index.html`). Deploy automático da `main` estava quebrado desde fevereiro; correção no PR #2 |
| Homologação (`hmg`) | Site novo publicado em https://copakaleo--hmg-rkmyzien.web.app (abre vazio: produção ainda sem dados e sem Functions) |
| Firestore (produção) | Existe, em `southamerica-east1`. Regras e índices publicados. Ainda sem dados |
| Realtime Database | Regras publicadas. Tudo fechado, exceto `transmissao/videoAtual` (escrita aberta, só texto até 40 caracteres) para o painel do site antigo continuar trocando o vídeo |
| Storage | Ativado em `us-east1` (cota gratuita; região não pode mudar). Regras publicadas |
| Functions | **Não publicadas.** Projeto tem faturamento ativo. Falta `firebase.cmd deploy --only functions` |
| Chaves | `ANTHROPIC_API_KEY` no Secret Manager. VAPID em `apps/web/.env.production` (é pública) |
| Senha do painel do site antigo | Trocada no PR #2 (guardada só como hash). **Só vale após o merge do PR #2.** O Bruno tem a senha nova |

## Próximos passos (em ordem)

1. **Merge do PR #2** na `main` (publica a senha nova do site antigo e conserta o deploy automático). Conferir antes a prévia do PR.
2. **Merge do PR #1** na `hmg`.
3. **Publicar as Functions:** `firebase.cmd deploy --only functions` (no PowerShell, use `firebase.cmd` em vez de `firebase`).
4. **Teste manual no navegador** com `npm run emulators` + `npm run seed` + `npm run dev`. Passar por cada tela com as contas de demonstração e anotar os problemas em "Problemas conhecidos".
5. Ativar os métodos de login no console (Google, e-mail/senha com link, telefone, anônimo; Facebook depois).
6. Quando o site novo substituir o antigo: remover a exceção de `transmissao/videoAtual` em `database.rules.json` e publicar com `firebase deploy --only database`.
7. Reduzir o pacote do Firebase no site (hoje ~256 KB comprimido).

## Problemas conhecidos

- **Conflito previsto:** quando a `hmg` for juntada na `main`, os arquivos `.github/workflows/*.yml` vão dar conflito (a `main` recebeu uma versão simplificada no PR #2). Resolver ficando com a versão da `hmg`.
- O "Craque do Jogo" só aparece depois que o primeiro voto chega (a tela pode explicar melhor).
- Notificações push (F23) não funcionam nos emuladores. Só dá para testar publicado.
- O rascunho por IA (F11) só usa a IA depois que as Functions forem publicadas. Sem elas (ou sem a chave), usa um modelo de texto fixo.
- Login por SMS gera custo por mensagem. Login com Facebook exige criar o app no Meta for Developers.

## Quem está mexendo em quê

Antes de começar uma tarefa, escreva aqui e faça push, para o outro saber. Ao terminar, apague a linha.

| Pessoa | Tarefa (ID do backlog) | Branch | Desde |
|---|---|---|---|
| — | — | — | — |

## Pull Requests abertos

| PR | De → Para | O que faz | Situação |
|---|---|---|---|
| [#1](https://github.com/BTFreitass/Copa-Kaleo2/pull/1) | `chore/deploy-firestore` → `hmg` | Atualiza este STATUS, `CLAUDE.md`, regras do Realtime Database e chave VAPID | Aguardando merge |
| [#2](https://github.com/BTFreitass/Copa-Kaleo2/pull/2) | `hotfix/senha-site-antigo` → `main` | Senha nova do site antigo, conserto do deploy da `main`, Copa Fácil e patrocinadores 43–51 no repositório | Aguardando merge (publica no site oficial) |

---

## Registro de produção

Tudo que mexeu no Firebase real (`copakaleo`) ou no site oficial. Uma linha por mudança, a mais recente no topo.

| Data | Quem | O que mudou | Como desfazer |
|---|---|---|---|
| 2026-11-11 | Bruno (Claude) | Regras do Realtime Database publicadas: banco fechado, só `transmissao/videoAtual` aberto | Editar `database.rules.json` e `firebase deploy --only database` |
| 2026-11-11 | Bruno | Segredo `ANTHROPIC_API_KEY` criado no Secret Manager (2 versões; vale a última) | `firebase functions:secrets:destroy ANTHROPIC_API_KEY` |
| 2026-11-11 | Bruno (Claude) | Regras do Storage publicadas | Editar `storage.rules` e `firebase deploy --only storage` |
| 2026-11-11 | Bruno | Storage ativado no console em `us-east1` | Não dá para mudar a região |
| 2026-11-11 | Bruno (Claude) | Regras e índices do Firestore publicados | Editar `firestore.rules` / `firestore.indexes.json` e `firebase deploy --only firestore` |
| 2026-11-11 | Bruno (Claude) | Primeiro deploy de homologação (canal `hmg`, expira em 30 dias e renova a cada push) | `firebase hosting:channel:delete hmg` |

---

## Diário

Uma entrada por sessão de trabalho, a mais recente no topo. Curta: o que mudou, o que ficou pela metade, o que o próximo precisa saber.

### 2026-11-11 (noite) · Bruno
- Senha do painel do site antigo trocada. A página agora guarda só o hash SHA-256; a senha nova ficou com o Bruno (não está em nenhum arquivo). PR #2 para a `main`.
- Descoberto que o deploy automático da `main` falhava desde fevereiro (`npm run build` sem `package.json`). Corrigido no PR #2.
- Descoberto que o site no ar tinha o link do Copa Fácil e os patrocinadores 43–51, publicados manualmente, mas a `main` não. Incluídos no PR #2 para o deploy não apagar nada.
- Regra de "Registro contínuo" adicionada ao `CLAUDE.md`, com o "Registro de produção" e a tabela de PRs abertos neste arquivo.

### 2026-11-11 (tarde) · Bruno
- Regras e índices do Firestore publicados em produção.
- Realtime Database estava aberto para qualquer um ler e apagar. Fechado, mantendo só `transmissao/videoAtual` gravável para o site antigo não quebrar (decisão do Bruno: opção "a").
- Storage ativado no console (us-east1, para usar a cota gratuita) e regras publicadas.
- `ANTHROPIC_API_KEY` criada no Secret Manager e chave VAPID adicionada ao `.env.production`.
- Deploy das Functions ficou pendente: precisa de autorização explícita ou ser rodado manualmente.

### 2026-11-11 · Bruno
- Monorepo criado: `packages/shared` (domínio), `apps/web` (React), `functions` (Cloud Functions), `scripts` (seed e simulação).
- Simulação revelou e corrigiu 2 bugs: Functions subindo na região errada (`us-central1`) e ranking gravando a mesma posição para todos (closure capturando variável do loop em `recomputeRanks`).
- Fluxo de branches definido: `main` = produção, `hmg` = homologação, `feat/*` para tarefas. Ver `docs/COLABORACAO.md`.
