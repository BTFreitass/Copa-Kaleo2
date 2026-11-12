# Onde paramos

> Arquivo de passagem de bastão entre sessões e entre colaboradores.
> **Claude: leia este arquivo inteiro no início de toda sessão e registre aqui cada ação relevante assim que ela acontecer** (regras em `CLAUDE.md` → "Registro contínuo").
> **Antes de alterar qualquer coisa, rode `git fetch` e confira se chegou commit novo** (regra em `CLAUDE.md` → "Antes de alterar QUALQUER coisa"). Se chegou, traga e releia este arquivo.
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
| Site oficial (`main`) | Site antigo (`public/index.html`). PR #2 mesclado (deploy automático consertado). **O deploy do merge está na fila do GitHub Actions há mais de 2 h**; enquanto não rodar, o site no ar continua com a versão anterior |
| Homologação (`hmg`) | Site novo publicado em https://copakaleo--hmg-rkmyzien.web.app (abre vazio: produção ainda sem dados e sem Functions) |
| Firestore (produção) | Existe, em `southamerica-east1`. Regras e índices publicados. Ainda sem dados |
| Realtime Database | Regras publicadas. Tudo fechado, exceto `transmissao/videoAtual` (escrita aberta, só texto até 40 caracteres) para o painel do site antigo continuar trocando o vídeo |
| Storage | Ativado em `us-east1` (cota gratuita; região não pode mudar). Regras publicadas |
| Functions | **Não publicadas.** Projeto tem faturamento ativo. Falta `firebase.cmd deploy --only functions` |
| Chaves | `ANTHROPIC_API_KEY` no Secret Manager. VAPID em `apps/web/.env.production` (é pública) |
| Senha do painel do site antigo | Trocada no PR #2, já mesclado (guardada só como hash). **Só vale depois que o deploy da `main` rodar.** O Bruno tem a senha nova |

## Próximos passos (em ordem)

1. **Destravar os deploys na fila** do GitHub Actions (`main` e `hmg`, na fila desde 2026-11-11 20:22 UTC). Ver a aba Actions do repositório; se não andarem, cancelar e rodar de novo (`gh run rerun <id> --repo BTFreitass/Copa-Kaleo2`). Depois, conferir que https://copakaleo.web.app tem a senha nova.
2. Seu amigo abre o Claude dele e pede: "Lê o STATUS.md e me diz onde paramos".
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
| [#3](https://github.com/BTFreitass/Copa-Kaleo2/pull/3) | `docs/status-pos-merge` → `hmg` | Regra "conferir o Git antes de alterar qualquer coisa" e STATUS pós-merge | Aberto |

Já mesclados (2026-11-11, por Bruno (Claude)): #1 `chore/deploy-firestore` → `hmg` e #2 `hotfix/senha-site-antigo` → `main`.

---

## Registro de produção

Tudo que mexeu no Firebase real (`copakaleo`) ou no site oficial. Uma linha por mudança, a mais recente no topo.

| Data | Quem | O que mudou | Como desfazer |
|---|---|---|---|
| 2026-11-11 | Bruno (Claude) | PR #2 mesclado na `main`: senha nova (hash) do site antigo, Copa Fácil, patrocinadores 43–51 e conserto do deploy. Deploy ainda na fila do GitHub | `git revert -m 1 1f01018` numa branch, PR para a `main` |
| 2026-11-11 | Bruno (Claude) | PR #1 mesclado na `hmg` (deploy de homologação na fila) | `git revert -m 1 8de39cf` numa branch, PR para a `hmg` |
| 2026-11-11 | Bruno (Claude) | Regras do Realtime Database publicadas: banco fechado, só `transmissao/videoAtual` aberto | Editar `database.rules.json` e `firebase deploy --only database` |
| 2026-11-11 | Bruno | Segredo `ANTHROPIC_API_KEY` criado no Secret Manager (2 versões; vale a última) | `firebase functions:secrets:destroy ANTHROPIC_API_KEY` |
| 2026-11-11 | Bruno (Claude) | Regras do Storage publicadas | Editar `storage.rules` e `firebase deploy --only storage` |
| 2026-11-11 | Bruno | Storage ativado no console em `us-east1` | Não dá para mudar a região |
| 2026-11-11 | Bruno (Claude) | Regras e índices do Firestore publicados | Editar `firestore.rules` / `firestore.indexes.json` e `firebase deploy --only firestore` |
| 2026-11-11 | Bruno (Claude) | Primeiro deploy de homologação (canal `hmg`, expira em 30 dias e renova a cada push) | `firebase hosting:channel:delete hmg` |

---

## Diário

Uma entrada por sessão de trabalho, a mais recente no topo. Curta: o que mudou, o que ficou pela metade, o que o próximo precisa saber.

### 2026-11-11 (fim da noite) · Bruno
- PRs #1 (→ `hmg`) e #2 (→ `main`) mesclados pelo Claude, a pedido do Bruno.
- Os deploys desses merges ficaram mais de 2 h na fila do GitHub Actions sem começar. O site no ar ainda não recebeu a senha nova. Primeiro item dos "Próximos passos".
- Regra nova no `CLAUDE.md`: antes de **qualquer** alteração (não só no início da sessão), rodar `git fetch` e conferir se chegou commit novo. Se chegou, parar, avisar, trazer e reler este arquivo. Também no `docs/COLABORACAO.md` (regra 5).
- URL de clone no tutorial corrigida para `BTFreitass/Copa-Kaleo2`.
- Novo `npm run demo` (`scripts/demo.ts`): depois do `npm run seed`, deixa o torneio no meio do dia nos emuladores. São 6 jogos encerrados com gols, cartões, check-ins e craque, 1 jogo ao vivo, palpites, a liga "Galera da Igreja", o mural e pacotes abertos. Só mexe nos emuladores, nunca em produção.

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
