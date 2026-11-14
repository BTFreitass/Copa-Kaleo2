# Copa Kaleo 2.0 — Backlog de Funcionalidades

Documento vivo. Cada funcionalidade tem um ID fixo (`M` = módulo base, `F` = funcionalidade extra) usado em commits, branches e PRs (ex.: `feat(F17): modo mesário`).

Esforço: 🟢 baixo · 🟡 médio · 🔴 alto
Status: ⬜ não iniciado · 🟦 implementado, aguardando validação · ✅ validado em produção

---

## Contexto do evento

- **Data prevista:** abril de 2027 (dia exato a definir).
- **Formato:** torneio rápido, **tudo acontece em um único dia**.

Consequência: a plataforma passa a ter **três fases**, e o engajamento não pode depender só do dia do jogo.

| Fase | Período | O que acontece |
|---|---|---|
| 🔥 **Pré-Copa** | ~10 semanas antes | Inscrições, notícias, palpites de longo prazo, ligas, álbum de figurinhas, conquistas. A torcida acumula Pontos Kaleo antes do evento |
| ⚽ **Dia da Copa** | 1 dia | Mesário, ao vivo, bolão jogo a jogo, telão, check-in, craque do jogo, termômetro, push |
| 🏅 **Pós-Copa** | ~2 semanas depois | Entrega das medalhas, Minha Copa Kaleo, álbuns de fotos, melhores momentos, Hall da Fama |

Regras ajustadas ao formato de um dia:
- **Mata-mata:** os palpites de cada jogo abrem **automaticamente** quando os dois times do confronto são definidos e travam no início da partida. As janelas podem ser de poucos minutos, então o push (F23) avisa "palpites abertos, fecham em 15 min".
- **Um campo só, partidas de ~30 min em sequência:** um mesário, um telão, uma transmissão. O palpite do próximo jogo fica aberto até o apito inicial dele, e o push avisa no intervalo entre as partidas. O campo continua configurável (`fields`) caso uma edição futura tenha mais de um.
- **Formato ainda indefinido:** o sistema não fixa um formato. O admin monta o torneio pelo **Montador de Torneio (F25)**.
- **Coringa (F06):** 1 na fase de grupos + 1 no mata-mata.
- **Duelo (F09):** vale para o dia inteiro ou para uma fase (grupos ou mata-mata).
- **Craque do Jogo (F03):** a votação fecha em 10 min. No encerramento há também a votação do **Craque da Copa**.
- **Figurinhas (F14):** o álbum abre na Pré-Copa para dar tempo de colecionar e trocar. No Dia da Copa os pacotes vêm do check-in e dos acertos.
- **Medalhas (F22):** entregues na noite do evento ou na manhã seguinte.

---

## Autenticação (S1)

Vários métodos, todos ligados à mesma conta (account linking):

| Método | Observação |
|---|---|
| Google | Principal |
| E-mail + senha | Com recuperação de senha |
| Link mágico por e-mail | Sem senha |
| Telefone (SMS) | Popular no Brasil. **Exige plano Blaze** e cada SMS tem custo |
| Facebook | Opcional |
| **Convidado** (anônimo) | Permite palpitar sem cadastro no Dia da Copa. Depois vira conta real sem perder os pontos (`linkWithCredential`) |

---

## Módulos base

| ID | Módulo | Descrição | Sprint | Status |
|---|---|---|---|---|
| M1 | Blog & Notícias | Feed de matérias pré/pós-jogo, filtros por time/categoria, Markdown sanitizado | S6 | 🟦 |
| M2 | Central Multimídia | Melhores momentos (YouTube/Reels) e álbuns de fotos por partida com lightbox | S7 | 🟦 |
| M3 | Transmissão Ao Vivo | Player YouTube Live/Twitch + cronograma das próximas partidas | S2 | 🟦 |
| M4 | Bolão | Login, palpites travados no horário do jogo, ranking geral | S4 | 🟦 |
| M5 | Estatísticas | Classificação de grupos, chaveamento, artilharia, cartões | S3 | 🟦 |
| M6 | Painel Admin | Posts, álbuns, placares, controle de jogos, times e configurações | S1→S7 | 🟦 |

---

## Funcionalidades extras

### 🏟️ Arquibancada + celular

| ID | Funcionalidade | Esforço | Sprint | Status |
|---|---|---|---|---|
| F01 | **Modo Telão** (`/telao`) | 🟢 | S5 | 🟦 |
| F02 | **Check-in na arquibancada** (QR rotativo) | 🟡 | S5 | 🟦 |
| F03 | **Craque do Jogo** (votação da torcida) | 🟢 | S5 | 🟦 |
| F04 | **Termômetro da torcida** (reações ao vivo) | 🟡 | S5 | 🟦 |

- **F01**: página para projetor/TV. Placar gigante em tempo real, QR code do bolão, top 10 do ranking, enquete do Craque do Jogo e mural de mensagens moderadas. Atualização 100% automática, sem interação.
- **F02**: QR code impresso no local, com token que muda por jogo. O check-in é validado por Cloud Function (callable) e não pode ser forjado pelo cliente. Gera presença, ranking de torcedor mais fiel, Pontos Kaleo e bônus no bolão. Gera também relatório de público para patrocinadores.
- **F03**: abre no apito final e fecha 15 min depois. Um voto por usuário. O resultado aparece na súmula, no telão e no card do Instagram (F10).
- **F04**: botões de reação 🔥 ⚽ 😱 🟥 na página ao vivo, com chuva de emojis sincronizada para todos e barra de "qual torcida está mais barulhenta". Usar **Realtime Database** (escrita de alta frequência, mais barato que o Firestore para isso).
- **Mural da torcida** (parte de F01): mensagens enviadas pelos usuários, aprovadas pelo admin antes de aparecer no telão.

### 🎯 Bolão turbinado

| ID | Funcionalidade | Esforço | Sprint | Status |
|---|---|---|---|---|
| F05 | **Ligas privadas** com código de convite | 🟡 | S4 | 🟦 |
| F06 | **Coringa**: palpite vale dobro, 1× por fase | 🟢 | S4 | 🟦 |
| F07 | **Palpites de longo prazo**: campeão, artilheiro, time-sensação | 🟢 | S4 | 🟦 |
| F08 | **O que a torcida acha**: distribuição dos palpites | 🟢 | S4 | 🟦 |
| F09 | **Duelo 1×1** entre amigos por rodada | 🟡 | S4 | 🟦 |

- **F05**: qualquer usuário cria uma liga e convida pelo código de 6 caracteres. Cada liga tem seu ranking, e o ranking geral continua existindo.
- **F06**: validação nas rules + Function (máx. 1 coringa por `stage`).
- **F07**: fecha no kickoff do primeiro jogo da edição. Pontuação alta, resolvida no encerramento.
- **F08**: exibido só **depois** que os palpites travam, para não influenciar ninguém. Agregado por Function em `matches/{id}.crowdStats`.
- **F09**: desafio enviado a outro usuário para uma rodada. O vencedor ganha uma conquista (F16).

### 🤖 Conteúdo automático

| ID | Funcionalidade | Esforço | Sprint | Status |
|---|---|---|---|---|
| F10 | **Card automático para Instagram** (1080×1920) | 🟡 | S6 | 🟦 |
| F11 | **Rascunho de matéria com IA** a partir da súmula | 🟡 | S6 | 🟦 |
| F12 | **Lance a lance em texto** | 🟢 | S2 | 🟦 |
| F13 | **Chance de classificação** (Monte Carlo) | 🟡 | S3 | 🟦 |

- **F10**: gerado por Function quando o jogo é encerrado (placar, escudos, gols, craque). Também gera os cards de classificação e de ranking do bolão. Download direto no admin.
- **F11**: a IA recebe os eventos da partida e devolve um rascunho de crônica que entra como `draft`. **Sempre** com revisão humana antes de publicar.
- **F12**: timeline ao vivo derivada dos eventos que o mesário registra (F17).
- **F13**: simulação dos jogos restantes, recalculada a cada resultado e exibida na tabela.

### 🃏 Colecionáveis e gamificação

| ID | Funcionalidade | Esforço | Sprint | Status |
|---|---|---|---|---|
| F14 | **Álbum de figurinhas digital** com trocas | 🔴 | S9 | 🟦 |
| F15 | **Cartas de atleta** com atributos evolutivos | 🟡 | S8 | 🟦 |
| F16 | **Conquistas** (selos no perfil) | 🟢 | S8 | 🟦 |
| F22 | **Medalha da Copa** (uma por usuário por edição) | 🟡 | S10 | 🟦 |
| — | **Pontos Kaleo** (XP de engajamento por edição) | 🟢 | S8 | 🟦 |

- **F14**: uma figurinha por jogador. Pacotinhos ganhos com check-in, palpite certo, voto no craque e conquistas. Figurinhas brilhantes para hat-trick e craque do jogo. A abertura de pacotes e as trocas são feitas **só no servidor** (callable + transaction) para evitar trapaça.
- **F15**: atributos (finalização, disciplina, regularidade…) derivados das estatísticas reais. Card compartilhável.
- **F16**: exemplos: 🔮 *Vidente* (3 placares exatos), 🧱 *Fiel* (5 check-ins), 🎲 *Corajoso* (acertou zebra), 🥇 *Líder por um dia*, ⚔️ *Duelista* (venceu 3 duelos).
- **Pontos Kaleo**: pontuação de engajamento separada dos pontos do bolão. Soma check-ins, palpites, acertos, votos, figurinhas e conquistas. É a base do nível da medalha (F22).

#### F22 — Medalha da Copa 🏅

Cada usuário que participou de uma edição recebe **uma medalha daquela Copa**, e as medalhas se acumulam ano após ano numa vitrine no perfil.

**Elegibilidade:** pelo menos uma ação na edição (palpite, check-in, voto ou figurinha).

**Níveis**, definidos pelos Pontos Kaleo da edição. Os limites ficam configuráveis em `tournaments/{id}.medalRules`:

| Nível | Critério sugerido |
|---|---|
| 🥉 Bronze — *Torcedor* | Participou |
| 🥈 Prata — *Torcedor Raiz* | ≥ 40% dos Pontos Kaleo máximos possíveis |
| 🥇 Ouro — *Torcedor de Elite* | ≥ 70% |
| 💎 Lendária | Top 3 do bolão geral **ou** top 1% em Pontos Kaleo |

**Distinções especiais** (gravadas na medalha como fitas/selos extras):
- 👑 Campeão do Bolão
- 🧱 Torcedor Mais Fiel (mais check-ins)
- 🔮 Melhor Vidente (mais placares exatos)
- ⚽ **Medalha de Atleta**: usuário vinculado a um jogador inscrito (F18) recebe uma variante de atleta. O campeão do torneio recebe a variante dourada de campeão.

**Detalhes:**
- Arte exclusiva por edição e por nível, enviada pelo admin (`medalArt` na edição).
- **Número de série**: "Medalha nº 0042 de 380", na ordem de entrada do usuário na edição.
- Entrega automática pela Function `onTournamentFinished`, com cerimônia no app: animação de revelação ao abrir o site após o encerramento.
- É o card final do **Minha Copa Kaleo** (F21) e é compartilhável nos stories.
- A medalha é registrada no **Hall da Fama** (F20): quantas lendárias por edição, quem tem todas as medalhas desde a primeira.
- Gravação imutável: só a Function escreve, e as rules bloqueiam qualquer escrita de cliente.
- Opcional físico: os donos de medalha Lendária recebem uma medalha física na premiação final.

### 🛠️ Ferramentas da organização

| ID | Funcionalidade | Esforço | Sprint | Status |
|---|---|---|---|---|
| F17 | **Modo Mesário** (registro de eventos na beira do campo) | 🟡 | S2 | 🟦 |
| F18 | **Inscrição online** de times e atletas | 🟡 | S1 | 🟦 |
| F19 | **Patrocinador da rodada + cupons** | 🟢 | S9 | 🟦 |

- **F17**: tela mobile-first com botões grandes (⚽ Gol, 🟨, 🟥, ⏱️ Início/Intervalo/Fim, 🔁 Substituição) e "desfazer" do último evento. Funciona offline com a persistência do Firestore e sincroniza quando a conexão volta. Papel `mesario` via custom claim, com acesso só ao jogo atribuído.
- **F18**: formulário com foto, documento e termo de responsabilidade. Aprovação no admin. O atleta aprovado vira um `player` e pode vincular sua conta de usuário (habilita a Medalha de Atleta e a figurinha oficial).
- **F19**: Pontos Kaleo ou conquistas liberam cupons dos patrocinadores, com contagem de resgates para relatório.

### 🏆 Memória e legado

| ID | Funcionalidade | Esforço | Sprint | Status |
|---|---|---|---|---|
| F20 | **Hall da Fama** multi-edição | 🟢 | S3 | 🟦 |
| F21 | **Minha Copa Kaleo** (retrospectiva pessoal) | 🟡 | S10 | 🟦 |

- **F20**: campeões, artilheiros históricos, maior goleada, jogador com mais títulos, recordes do bolão e medalhas lendárias por edição. Exige que **tudo** seja particionado por `tournamentId` desde o Sprint 0.
- **F21**: sequência de cards no estilo stories: jogos presentes, placares exatos, posição no bolão, figurinhas completas, conquistas e, no último card, a **revelação da Medalha (F22)**.

### 📲 Transversal

| ID | Funcionalidade | Esforço | Sprint | Status |
|---|---|---|---|---|
| F23 | **Notificações push** (FCM) | 🟡 | S11 | 🟦 |
| F24 | **Time do coração**: site personalizado com as cores do time | 🟢 | S8 | 🟦 |

| F25 | **Montador de Torneio** | 🟡 | S6 | 🟦 |

- **F25**: o admin informa o nº de times, de grupos, quantos avançam, se tem disputa de 3º lugar, a duração da partida, o intervalo entre jogos e o horário de início. O sistema gera grupos, partidas, chaveamento (`feedsFrom`) e o horário de cada jogo, mostrando o horário previsto de término do dia. Tudo continua editável à mão depois.
- **F23**: "seu palpite fecha em 30 min", "GOL do seu time", "votação do craque aberta", "sua medalha chegou".

---

## Cronograma (reorganizado pelas três fases)

Sprints de 2 semanas a partir de 16/11/2026. As datas são aproximadas e serão recalculadas quando o dia da Copa for definido.

### Fase A — Portal Pré-Copa no ar (meta: meados de janeiro)

| Sprint | Período | Itens |
|---|---|---|
| **S0** | 16/11 – 29/11 | Fundação: Vite + TS + Tailwind + Router, Firebase + emuladores, `shared/ui`, PublicLayout, CI com build, migração das imagens e patrocinadores |
| **S1** | 30/11 – 13/12 | Autenticação (todos os métodos + convidado), papéis `admin`/`mesario`, AdminLayout, CRUD de times/jogadores, **F18** Inscrições |
| **S2** | 14/12 – 10/01 | **M1** Blog, **F20** Hall da Fama (edição 1 cadastrada manualmente), **F24** Time do coração, perfil. *Período com festas: 4 semanas* |
| 🚀 | ~11/01 | **Lançamento do portal Pré-Copa**: inscrições abertas e notícias |

### Fase B — Engajamento Pré-Copa (meta: fevereiro)

| Sprint | Período | Itens |
|---|---|---|
| **S3** | 11/01 – 24/01 | Registro de `activity`, Pontos Kaleo, **F16** Conquistas, estrutura da **F22** (níveis e regras) |
| **S4** | 25/01 – 07/02 | **M4** Bolão base, **F07** Longo prazo, **F05** Ligas, **F09** Duelo, **F06** Coringa |
| **S5** | 08/02 – 21/02 | **F14** Figurinhas + trocas, **F15** Cartas de atleta, **F19** Cupons |
| 🚀 | ~22/02 | **Lançamento do bolão e do álbum** |

### Fase C — Pronto para o Dia da Copa (meta: fim de março)

| Sprint | Período | Itens |
|---|---|---|
| **S6** | 22/02 – 07/03 | **F25** Montador de Torneio, CRUD de partidas, **F17** Modo Mesário (offline), **M3** Ao Vivo, **F12** Lance a lance, abertura automática de palpites do mata-mata |
| **S7** | 08/03 – 21/03 | **M5** Estatísticas + chaveamento, **F13** Chance de classificação, **F08** O que a torcida acha, **F23** Push |
| **S8** | 22/03 – 04/04 | **F01** Telão, **F02** Check-in, **F03** Craque do Jogo/da Copa, **F04** Termômetro, **F10** Cards automáticos, **F11** Rascunho IA |
| 🧪 | ~05/04 | **Ensaio geral**: um "dia da Copa" simulado com jogos-teste, mesários reais e carga de usuários |

### Fase D — Pós-Copa

| Sprint | Período | Itens |
|---|---|---|
| **S9** | antes do evento | **F22** entrega das medalhas + revelação, **F21** Minha Copa Kaleo. *O código precisa estar pronto antes do dia, pois roda no encerramento* |
| **S10** | após o evento | **M2** Upload dos álbuns + melhores momentos, Hall da Fama da edição, PWA, OG tags, ajustes |

**Dependências críticas**
- O registro de `activity` precisa estar ativo **antes do lançamento do bolão (S4)**, senão a participação na Pré-Copa não conta para a medalha.
- F17 (Mesário) alimenta M3, M5, F10, F12, F13 e F15. Precisa estar **à prova de falhas**: é o ponto único do Dia da Copa.
- O Dia da Copa concentra todos os acessos em poucas horas. O ensaio geral é obrigatório.
- F22 depende de Pontos Kaleo + F16 + F18 (variante de atleta).

---

## Decisões registradas

| Data | Decisão |
|---|---|
| 2026-11-12 | F25: cada edição tem o ID do ano (`tournaments/2027`) e é criada pelo painel quando não existe nenhuma ativa. A edição ativa fica em `settings/site.activeTournamentId`; sem ela, o painel só libera Usuários e Transmissão/patrocínio |
| 2026-11-12 | Tempo de jogo padrão: futsal oficial, 2 × 20 min com intervalo de 10 min (15 como alternativa rápida), editável por edição em Painel → Torneio. O cronograma reserva 2 × tempo + intervalo + tempo entre jogos. Como no futsal o cronômetro para, use o "entre jogos" como folga para o tempo real maior |
| 2026-11-12 | F17: o relógio da partida é controlado pelo mesário (pausar, retomar, reiniciar e ajustar à mão) e não corre sozinho pelo horário de início. O 2º tempo começa em metade da duração do jogo (ex.: 15:00 num jogo de 30 min). Não há limite de acréscimos: quem decide o fim é o mesário |
| 2026-11-14 | Esquemas de cores escolhidos pelo painel (Admin → Personalização), gravados em `settings/site.palette` e válidos para todos os visitantes. Padrão: **Quadra noturna** (neutros grafite em vez de marinho, título em azul/branco/vermelho sem degradê, linhas de quadra no destaque da home). O **Clássico** (visual de 2026-11-12) continua disponível. Só esquemas prontos, sem seletor de cor livre, para ninguém deixar o site ilegível. O esquema fica guardado no navegador (`copa:palette`) para não piscar ao carregar |
| 2026-11-12 | Identidade visual: azul (#1d4ed8, principal), vermelho (#dc2626, destaque e ao vivo) e branco, como na logo, com neutros azul-marinho. Modo claro e escuro, seguindo o sistema por padrão. As paletas `purple`/`pink` do Tailwind foram remapeadas para azul/vermelho em vez de trocar classe por classe |
| 2026-11-12 | MySQL é só uma **cópia para consulta** (Workbench, SQL, relatórios), gerada por `npm run mysql:sync`. O Firestore continua sendo a fonte da verdade e o site não usa MySQL. Trocar o Firebase pelo MySQL foi descartado (reescrita grande, perde o tempo real, exige servidor e hospedagem) |
| 2026-11-10 | Stack: Vite + React Router + TS + Tailwind + Lucide + TanStack Query + Zod, Firebase (Firestore, Auth, Storage, Hosting, Functions v2) |
| 2026-11-10 | Todas as funcionalidades F01–F21 aprovadas para o escopo |
| 2026-11-10 | Nova funcionalidade F22: medalha por usuário por edição |
| 2026-11-10 | F23 e F24 adicionadas como complementos |
| 2026-11-10 | Reações ao vivo (F04) no Realtime Database. O restante no Firestore |
| 2026-11-10 | Toda lógica com valor competitivo (pontos, check-in, figurinhas, medalhas) é executada no servidor |
| 2026-11-11 | Copa prevista para abril/2027, em **um único dia** → plataforma dividida em Pré-Copa / Dia da Copa / Pós-Copa |
| 2026-11-11 | Cronograma reorganizado: portal Pré-Copa em jan, bolão e álbum em fev, Dia da Copa pronto no fim de mar |
| 2026-11-11 | Login com vários métodos + modo convidado com vinculação posterior |
| 2026-11-11 | Projeto provavelmente no plano Spark → decisão sobre Blaze pendente (ver perguntas) |
| 2026-11-11 | 1 campo, partidas de ~30 min em sequência |
| 2026-11-11 | Formato indefinido → criado F25 Montador de Torneio (formato configurável) |
| 2026-11-11 | Sem login Apple |
| 2026-11-11 | Primeira implementação completa (M1–M6, F01–F25) feita de uma vez, a pedido do Bruno, para avaliar o comportamento antes de seguir sprint a sprint |
| 2026-11-11 | TanStack Query dispensado: todas as telas usam listeners em tempo real (`useCollection`/`useDocument`), que se encaixam melhor num evento ao vivo |
| 2026-11-11 | Datas gravadas como número (epoch ms), não `Timestamp`, para compartilhar tipos entre site e Functions. As regras comparam com `request.time.toMillis()` |
| 2026-11-11 | Atletas numa coleção `players` de nível superior (não subcoleção), para facilitar estatísticas e figurinhas |
| 2026-11-11 | F10 (cards para stories) e F13 (chance de classificação) rodam no navegador: não dependem de Functions |
| 2026-11-11 | Nível da medalha calculado em relação ao maior Pontos Kaleo da edição (não a um "máximo possível" teórico) |
| 2026-11-11 | Functions em `southamerica-east1`. O Firestore de produção deve ser criado na mesma região |
| 2026-11-11 | F11 usa Claude Opus 5.5 com saída estruturada e fallback automático. Sem chave da API, gera o rascunho por modelo de texto fixo |

## Perguntas em aberto

- [ ] **Migrar para o plano Blaze?** Recomendado: no Spark o site para quando a cota diária estoura, o que pode acontecer justo no Dia da Copa
- [ ] Data exata da Copa em abril
- [ ] Formato: nº de times, de grupos e quantos avançam (pode ser decidido até o S6)
- [ ] Horário de início do dia e intervalo entre partidas
- [ ] Critérios finais dos níveis da medalha (F22) e se haverá medalha física
- [ ] Quem produz a arte das medalhas e das figurinhas
