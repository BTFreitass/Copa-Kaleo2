# Onde paramos

> Arquivo de passagem de bastão entre sessões e entre colaboradores.
> **Claude: leia este arquivo inteiro no início de toda sessão e registre aqui cada ação relevante assim que ela acontecer** (regras em `CLAUDE.md` → "Registro contínuo").
> **Antes de alterar qualquer coisa, rode `git fetch` e confira se chegou commit novo** (regra em `CLAUDE.md` → "Antes de alterar QUALQUER coisa"). Se chegou, traga e releia este arquivo.
> Humanos: leiam antes de pegar uma tarefa, para não fazer em dobro.
> **Nunca escreva senhas, chaves secretas ou tokens neste arquivo.**

**Última atualização:** 2026-11-12 · Bruno (com Claude)
**Branch de trabalho:** `hmg` · **Produção:** `main` (site antigo ainda no ar)

---

## Estado atual

| Área | Situação |
|---|---|
| Código | Primeira versão completa de **todas** as funcionalidades (M1–M6, F01–F25) na `hmg` |
| Tipagem / build | `npm run typecheck` e `npm run build` passam |
| Testes de domínio | `npm test`: 12/12 passando |
| Simulação ponta a ponta | `npm run simulate`: 27/27 verificações passando (regras de segurança, bolão, mata-mata, figurinhas, cupons, medalhas, Hall da Fama) |
| Testado no navegador | Teste automático (Chrome headless) em todas as telas públicas, do torcedor, admin, mesário e telão: carregam sem erro após as correções de 2026-11-12. Falta alguém clicar nos fluxos à mão |
| Site oficial (`main`) | Site antigo (`public/index.html`). PR #2 mesclado (deploy automático consertado). **O deploy do merge está na fila do GitHub Actions há mais de 2 h**; enquanto não rodar, o site no ar continua com a versão anterior |
| Homologação (`hmg`) | Atualizada em 2026-11-12 com tudo do PR #3 (cores novas, modo claro/escuro, cronômetro do mesário, correções). https://copakaleo--hmg-rkmyzien.web.app abre vazio: produção ainda sem dados e sem Functions |
| Firestore (produção) | Existe, em `southamerica-east1`. Regras e índices publicados. Ainda sem dados |
| Realtime Database | Regras publicadas. Tudo fechado, exceto `transmissao/videoAtual` (escrita aberta, só texto até 40 caracteres) para o painel do site antigo continuar trocando o vídeo |
| Storage | Ativado em `us-east1` (cota gratuita; região não pode mudar). Regras publicadas |
| Functions | **Não publicadas.** Projeto tem faturamento ativo. Falta `firebase.cmd deploy --only functions` |
| Chaves | `ANTHROPIC_API_KEY` no Secret Manager. VAPID em `apps/web/.env.production` (é pública) |
| Senha do painel do site antigo | Trocada no PR #2, já mesclado (guardada só como hash). **Só vale depois que o deploy da `main` rodar.** O Bruno tem a senha nova |

## Próximos passos (em ordem)

1. **Destravar o deploy da `main` na fila** (execução 43095621241, presa desde 2026-11-11 20:22 UTC). Publica o site oficial com a senha nova do painel: cancelar e rodar de novo na aba Actions **só com autorização do Bruno**. Depois, conferir que https://copakaleo.web.app tem a senha nova.
2. **Publicar as regras do Firestore** (`firebase.cmd deploy --only firestore:rules`): sem isso, o cronômetro do mesário e a correção do bolão não funcionam em produção.
3. Seu amigo abre o Claude dele e pede: "Lê o STATUS.md e me diz onde paramos".
4. **Publicar as Functions:** `firebase.cmd deploy --only functions` (no PowerShell, use `firebase.cmd` em vez de `firebase`).
5. **Teste manual no navegador** com `npm run emulators` + `npm run seed` + `npm run dev`. Passar por cada tela com as contas de demonstração e anotar os problemas em "Problemas conhecidos".
6. Ativar os métodos de login no console (Google, e-mail/senha com link, telefone, anônimo; Facebook depois).
7. Quando o site novo substituir o antigo: remover a exceção de `transmissao/videoAtual` em `database.rules.json` e publicar com `firebase deploy --only database`.
8. Reduzir o pacote do Firebase no site (hoje ~256 KB comprimido).

## Problemas conhecidos

- **Regras do Firestore em produção desatualizadas:** faltam a correção de leitura de palpites/check-ins inexistentes e a permissão para o mesário gravar `clockElapsedMs`/`clockRunning`/`halftimeStartedAt`. Sem isso, o cronômetro novo não funciona em produção. Já está em `firestore.rules`; falta publicar com `firebase deploy --only firestore:rules`.
- **Conflito previsto:** quando a `hmg` for juntada na `main`, os arquivos `.github/workflows/*.yml` vão dar conflito (a `main` recebeu uma versão simplificada no PR #2). Resolver ficando com a versão da `hmg`.
- O "Craque do Jogo" só aparece depois que o primeiro voto chega (a tela pode explicar melhor).
- Notificações push (F23) não funcionam nos emuladores. Só dá para testar publicado.
- O rascunho por IA (F11) só usa a IA depois que as Functions forem publicadas. Sem elas (ou sem a chave), usa um modelo de texto fixo.
- Login por SMS gera custo por mensagem. Login com Facebook exige criar o app no Meta for Developers.

## Quem está mexendo em quê

Antes de começar uma tarefa, escreva aqui e faça push, para o outro saber. Ao terminar, apague a linha.

| Pessoa | Tarefa (ID do backlog) | Branch | Desde |
|---|---|---|---|
| Bruno (Claude) | Esquema de cores "Quadra noturna" + escolha do esquema no painel (Personalização) | `feat/paleta-personalizavel` | 2026-11-14 |

## Pull Requests abertos

| PR | De → Para | O que faz | Situação |
|---|---|---|---|
| — | — | — | — |

Já mesclados: #1 `chore/deploy-firestore` → `hmg` e #2 `hotfix/senha-site-antigo` → `main` (2026-11-11, Bruno (Claude)); #3 `docs/status-pos-merge` → `hmg` (2026-11-12, Bruno), com as cores novas, o modo claro/escuro, o cronômetro e o tempo de jogo do mesário, o MySQL e as correções do site.

---

## Registro de produção

Tudo que mexeu no Firebase real (`copakaleo`) ou no site oficial. Uma linha por mudança, a mais recente no topo.

| Data | Quem | O que mudou | Como desfazer |
|---|---|---|---|
| 2026-11-12 | Bruno (Claude) | Conta do Bruno no Firebase Auth real recebeu o papel de admin (custom claim `admin: true`), para usar o painel na homologação. Feito com a sessão do Firebase CLI, pela API do Identity Toolkit (`accounts:update`) | No painel, em "Usuários e papéis", tirar o admin (precisa das Functions publicadas), ou rodar de novo a mesma chamada sem o `admin` |
| 2026-11-12 | Bruno | PR #3 mesclado na `hmg`; deploy de homologação concluído (execução 43277623204) | `git revert -m 1 bafec80` numa branch, PR para a `hmg` |
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

### 2026-11-12 (noite) · Bruno (Claude)
- Painel em branco na homologação (Torneio vazio): o código da hmg ainda é o antigo, sem edição a página não desenha nada. O PR #4 resolve; agora a tela "Criar a edição do torneio" aparece também quando `activeTournamentId` aponta para uma edição que não existe.

### 2026-11-11 (fim da noite) · Bruno
- PRs #1 (→ `hmg`) e #2 (→ `main`) mesclados pelo Claude, a pedido do Bruno.
- Os deploys desses merges ficaram mais de 2 h na fila do GitHub Actions sem começar. O site no ar ainda não recebeu a senha nova. Primeiro item dos "Próximos passos".
- Regra nova no `CLAUDE.md`: antes de **qualquer** alteração (não só no início da sessão), rodar `git fetch` e conferir se chegou commit novo. Se chegou, parar, avisar, trazer e reler este arquivo. Também no `docs/COLABORACAO.md` (regra 5).
- URL de clone no tutorial corrigida para `BTFreitass/Copa-Kaleo2`.
- **Bug grave corrigido: o site inteiro travava em loop infinito de renderização** ("Maximum update depth exceeded") e a maioria das páginas abria vazia. Causa: `converter()` em `apps/web/src/shared/lib/data.ts` criava um conversor novo a cada chamada, então `refEqual`/`queryEqual` nunca davam iguais e os hooks reabriam a escuta sem parar. Agora o conversor é único.
- Corrigidas as regras de leitura de `predictions`, `longTermPredictions` e `checkins`: ler um documento que ainda não existe (ex.: palpite em jogo sem palpite) dava permissão negada. Agora o `get` confere o ID (`<id>_<uid>`).
- **Cópia em MySQL para o Workbench:** `sql/schema.sql` (14 tabelas com chaves estrangeiras e as views `v_jogos`, `v_classificacao`, `v_artilharia` e `v_ranking_bolao`) e `npm run mysql:sync`, que recria o banco `copa_kaleo` e copia os dados do Firestore. Por padrão lê os emuladores; com `-- --prod` lê o Firebase real (precisa de `gcloud auth application-default login`). A senha do MySQL fica no `.env`, fora do Git. Testado com o MySQL do XAMPP (MariaDB 10.11, `root` sem senha, que é o padrão do script): 14 tabelas copiadas e views conferidas com o site. O MySQL Workbench novo (26.x) **não conecta no MariaDB** (erro `explain_json_format_version`). Por isso o Bruno instalou o MySQL 8.4 oficial na **porta 3307**, ao lado do XAMPP, com o serviço `MySQL84`. A porta e a senha ficam no `.env`. Cópia testada lá também, com os acentos conferidos.
- **Criar edição pelo painel (F25):** sem edição ativa (caso do Firebase real, ainda vazio), o painel mostra "Criar a edição do torneio", com nome, ano, nº da edição, data e horário do primeiro jogo, já no padrão futsal 2×20 + 10. A tela cria `tournaments/{ano}` e aponta `settings/site.activeTournamentId`. Antes, cadastrar time sem edição gravava com `tournamentId` vazio e o time nunca aparecia na lista (relato do Bruno na homologação). Regra em `packages/shared/src/edition.ts` (`newEdition`, `validateEdition`), com 21/21 testes. Testado no local, simulando o banco vazio: criou a edição e o time apareceu na lista em 10 ms.
- **Tempo de jogo configurável (padrão futsal 2×20):** novo quadro "Tempo de jogo" em Painel → Torneio, com cada tempo (padrão 20 min, botão 2×20), intervalo da partida (10 ou 15 com um toque, ou valor livre) e tempo entre um jogo e outro (o antigo campo "Intervalo" do montador, que era isso). Os valores ficam em `format.halfDurationMin` e `format.halftimeMin`, lidos por `matchTiming()`; torneios sem esses campos usam 2×20 + 10. O cronograma do dia agora soma o intervalo da partida (antes ignorava). No intervalo, o mesário vê a contagem regressiva e o site mostra "Intervalo · volta em X min" (campo novo `halftimeStartedAt`). 19/19 testes. O seed e o torneio local já estão em 2×20 + 10.
- **Cronômetro do mesário (F17):** o mesário controla o relógio com Iniciar 1º tempo, Pausar/Retomar, Reiniciar o período, Ajustar (digitando min:seg ou com ±10 s/±1 min), Intervalo, Iniciar 2º tempo e Encerrar. O seletor 1º tempo / Intervalo / 2º tempo serve para corrigir um toque errado. O jogo ganhou os campos `clockElapsedMs` e `clockRunning`, e a conta fica em `matchClock()` no `packages/shared`, com 4 testes novos (16/16). Jogos antigos sem os campos continuam funcionando. O site mostra "⏸ Pausado" quando o relógio está parado. Testado de ponta a ponta no navegador.
- Menu do topo sem barra de rolagem: o botão "Painel" saiu do topo (continua no menu do avatar e no menu ☰) e os links ficaram mais próximos. Cabe a partir de 1280 px mesmo logado; abaixo disso vira o menu ☰.
- **Novo esquema de cores + modo claro/escuro:** paleta do azul, vermelho e branco da logo, com cinzas puxados para azul-marinho. Fica toda em `apps/web/src/index.css`: as classes `purple-*` agora são azul, `pink-*` agora são vermelho e `gray-*` são os neutros, e as classes `.light` e `.dark` trocam os valores. O botão ☀️/🌙 no topo alterna o modo; o padrão segue o sistema e a escolha fica salva no navegador (`copa:theme`). Para texto branco sobre fundo colorido, use `text-snow` (`text-white` inverte no modo claro). Telão, carta do jogador, figurinhas e cards de stories levam a classe `dark` para ficarem sempre escuros.
- **Login morto travava o site inteiro:** se a conta deixa de existir e o token vence, o Firebase devolve `auth/invalid-refresh-token`, não desloga sozinho e o Firestore fica "offline" (nada carrega). O `AuthProvider` agora desloga nesses casos.
- Avatar do topo virou um menu com **Meu perfil**, **Painel** (admin/mesário) e **Sair**. Antes o "Sair" só existia no fim da página de perfil.
- **"Perfil não encontrado" com usuário logado:** se o documento `users/{uid}` some (ex.: dados dos emuladores zerados com a aba aberta), o `AuthProvider` agora recria o perfil sozinho.
- **Perfil ficava carregando para sempre:** se renovar o login ou criar o perfil desse erro (ex.: aba aberta enquanto os emuladores estavam desligados), o `AuthProvider` nunca marcava o fim do carregamento. Agora sempre marca, e a criação do perfil roda em paralelo.
- Nos emuladores, o site usa cache em memória (o cache persistente misturava dados de execuções antigas dos emuladores). Em produção continua persistente.
- **Banco local que persiste:** `npm run emulators` carrega `.emulator-data` se existir e salva ao fechar com Ctrl+C. Há também `npm run emulators:save` e `emulators:reset`. A pasta não vai para o Git: cada um tem o seu banco.
- Links do rodapé (Inscrições e Copa Fácil) movidos para a barra de cima, a pedido do Bruno. O menu completo aparece a partir de 1280 px; abaixo disso, fica no menu ☰.
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
