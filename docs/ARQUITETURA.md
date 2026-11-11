# Copa Kaleo 2.0 — Arquitetura

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | Vite + React + TypeScript, React Router v7, Tailwind CSS, Lucide Icons |
| Dados no cliente | TanStack Query + SDK modular do Firebase (`onSnapshot` para o ao vivo) |
| Formulários / validação | React Hook Form + Zod (schemas compartilhados com as Functions) |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-sanitize` |
| Lightbox | `yet-another-react-lightbox` |
| Backend | Firebase: Firestore, Realtime Database (F04), Auth, Storage, Hosting, Cloud Functions v2, Cloud Messaging (F23) |
| Imagens | Extensão Resize Images (thumb 400px / médio 1200px), geração de cards sociais via Function (F10) |
| Testes | Vitest (domínio e Functions), Playwright (E2E), Emulator Suite (rules) |

**Por que Vite e não Next.js:** o Firebase Hosting serve SPA estática sem custo extra. SEO e prévia de link para as rotas `/noticias/:slug` serão resolvidos com uma Function que injeta OG tags (S11).

**Requisito:** projeto Firebase no plano **Blaze** (Cloud Functions).

## Estrutura

```
copa-kaleo/
├── apps/web/
│   └── src/
│       ├── app/                    # App, router, providers, layouts (Public, Admin, Telao, Mesario)
│       ├── features/
│       │   ├── auth/
│       │   ├── news/               # M1, F11 (review de rascunho IA no admin)
│       │   ├── media/              # M2
│       │   ├── live/               # M3, F04, F12
│       │   ├── matches/            # súmula, timeline
│       │   ├── predictions/        # M4, F05–F09
│       │   ├── stats/              # M5, F13
│       │   ├── teams/              # times, elencos, F15 cartas
│       │   ├── fan/                # F02 check-in, F03 craque, mural
│       │   ├── telao/              # F01
│       │   ├── mesario/            # F17
│       │   ├── registrations/      # F18
│       │   ├── gamification/       # Pontos Kaleo, F16, F24
│       │   ├── stickers/           # F14
│       │   ├── medals/             # F22 vitrine, revelação, share
│       │   ├── wrapped/            # F21
│       │   ├── hall-of-fame/       # F20
│       │   ├── sponsors/           # F19
│       │   ├── notifications/      # F23
│       │   └── admin/              # telas de gestão de cada módulo
│       ├── shared/                 # ui/, components/, hooks/, lib/ (firebase, converters), utils/
│       └── main.tsx
├── functions/src/
│   ├── triggers/  callable/  scheduled/
│   └── domain/                     # scoring, standings, odds, kaleoPoints, medals, packs — funções puras e testadas
├── packages/shared/                # schemas Zod + tipos (web + functions)
├── docs/                           # este planejamento
├── firestore.rules  database.rules.json  storage.rules
└── firebase.json
```

Cada feature segue o mesmo formato: `components/`, `pages/`, `hooks/`, `services/`, `schemas.ts`.

## Rotas

| Rota | Página |
|---|---|
| `/` | Home: ao vivo, notícias, próximos jogos, top 5 do bolão |
| `/noticias`, `/noticias/:slug` | M1 |
| `/ao-vivo` | M3 + F04 + F12 |
| `/jogos`, `/jogos/:id` | Calendário e súmula (+ votação F03) |
| `/midia/videos`, `/midia/albuns/:id` | M2 |
| `/classificacao`, `/chaveamento`, `/estatisticas` | M5 + F13 |
| `/times/:slug`, `/jogadores/:id` | Elenco e carta do atleta (F15) |
| `/bolao`, `/bolao/ranking`, `/bolao/ligas/:id`, `/bolao/duelos` | M4, F05–F09 |
| `/figurinhas`, `/figurinhas/trocas` | F14 |
| `/perfil/:uid` | Conquistas, vitrine de medalhas, figurinhas |
| `/minha-copa/:tournamentId` | F21 |
| `/hall-da-fama` | F20 |
| `/checkin/:matchId?t=token` | F02 (destino do QR code) |
| `/inscricao` | F18 |
| `/telao/:matchId` | F01 (layout sem navegação) |
| `/mesario/:matchId` | F17 (claim `mesario` ou `admin`) |
| `/admin/*` | M6 (claim `admin`) |

## Princípios de segurança

- Tudo que vale ponto, medalha ou figurinha é calculado **no servidor**.
- O palpite trava pelo `request.time < match.kickoffAt` validado nas rules.
- O token do check-in fica em subcoleção privada, inacessível ao cliente.
- Rules testadas no Emulator Suite antes de cada deploy.
