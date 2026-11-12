# Como trabalhar em dupla sem pisar no código do outro

## As 5 regras

1. **Sempre comece puxando o código mais novo** (`git pull`). Sempre.
2. **Nunca commite direto na `main` nem na `hmg`.** Cada tarefa ganha a sua branch.
3. **Antes de começar, avise em `docs/STATUS.md`** o que você vai fazer.
4. **Registre tudo em `docs/STATUS.md` na hora:** PRs abertos, qualquer mudança no Firebase de verdade ou no site oficial (com como desfazer) e o diário da sessão. O Claude de cada um já faz isso sozinho; se você mexer em algo pelo console, conte para ele registrar. Nunca escreva senhas ou chaves lá.
5. **Antes de alterar qualquer coisa, confira de novo se chegou novidade** (`git fetch` e `git log HEAD..origin/hmg`). Vale para cada edição, commit, merge ou deploy, não só para o começo do dia. Se chegou algo, traga para a sua branch antes de mexer.

## Como as branches funcionam

```
feat/F17-mesario ─┐
feat/F05-ligas  ──┼──► hmg ──────► main
fix/ranking     ──┘    (teste)     (site no ar)
```

| Branch | Para quê | O que acontece no push |
|---|---|---|
| `main` | Produção: o que o público vê | Publica em **copakaleo.web.app** |
| `hmg` | Homologação: tudo junto, para testar | Publica num link de preview (canal `hmg`) |
| `feat/...` / `fix/...` | Uma tarefa por branch | Nada. No Pull Request, o GitHub gera um link de preview e roda os testes |

---

## Primeira vez (só uma vez por computador)

```bash
git clone https://github.com/BTFreitass/Copa-Kaleo2.git
cd Copa-Kaleo2
git checkout hmg
npm install
```

Também precisa de: Node 22 ou mais novo, Java 21 (para os emuladores) e `npm install -g firebase-tools`.

---

## Todo dia, ao começar

```bash
git checkout hmg
git pull
npm install                         # só se alguém mudou dependências; não faz mal rodar sempre
git checkout -b feat/F17-mesario    # nome: feat/ ou fix/ + ID do backlog + assunto
```

Depois, edite `docs/STATUS.md` → "Quem está mexendo em quê", faça commit e push dessa linha logo:

```bash
git add docs/STATUS.md
git commit -m "docs: Bruno pegou F17"
git push -u origin feat/F17-mesario
```

## Enquanto trabalha

Commite pequeno e com frequência:

```bash
git add .
git commit -m "feat(F17): botão de desfazer lance"
git push
```

Se a tarefa demorar mais de um dia, traga as novidades da `hmg` para a sua branch:

```bash
git fetch
git merge origin/hmg
```

## Ao terminar uma tarefa

1. Rode as verificações:
   ```bash
   npm run typecheck
   npm test
   ```
2. Atualize `docs/STATUS.md` (o diário e a tabela de quem está mexendo) e o status da tarefa em `docs/BACKLOG.md`.
3. Faça push e abra um **Pull Request da sua branch para a `hmg`** no GitHub.
4. O outro revisa e aprova. O PR mostra um link de preview para testar.
5. Faça o merge e apague a branch.

## Quando a `hmg` estiver boa para o público

Abra um **Pull Request da `hmg` para a `main`**. Ao fazer o merge, o site no ar é atualizado.

> ⚠️ O primeiro merge na `main` troca o site antigo pelo novo. Só façam isso quando tudo estiver testado na `hmg`.

---

## Deu conflito?

Acontece quando os dois mexeram nas mesmas linhas. O Git marca o arquivo assim:

```
<<<<<<< HEAD
versão da sua branch
=======
versão que veio da hmg
>>>>>>> origin/hmg
```

Escolha o que fica (ou junte as duas), apague as marcações, e:

```bash
git add arquivo-resolvido
git commit
```

Pode pedir ao Claude: *"resolve o conflito em tal arquivo mantendo as duas mudanças"*. Na dúvida, chame o outro antes de escolher.

## Usando o Claude Code

O Claude de vocês lê o `CLAUDE.md` automaticamente. Ele já está instruído a:

- puxar o código mais novo e ler `docs/STATUS.md` antes de começar;
- conferir de novo se chegou commit novo **antes de cada alteração**, e parar para avisar se chegou;
- trabalhar numa branch `feat/` ou `fix/`, nunca direto na `main` ou na `hmg`;
- atualizar `docs/STATUS.md` ao terminar.

Uma boa primeira mensagem para ele: **"Lê o STATUS.md e me diz onde paramos."**

---

## Colinha

| Quero... | Comando |
|---|---|
| Ver em que branch estou | `git status` |
| Pegar o código mais novo | `git checkout hmg && git pull` |
| Ver se chegou algo antes de mexer | `git fetch && git log --oneline HEAD..origin/hmg` |
| Começar uma tarefa | `git checkout -b feat/F05-ligas` |
| Salvar meu trabalho | `git add . && git commit -m "feat(F05): ..." && git push` |
| Trazer novidades para minha branch | `git fetch && git merge origin/hmg` |
| Rodar o site localmente | `npm run emulators` (terminal 1), `npm run seed` (só na primeira vez) e depois `npm run dev` (terminal 2) |
| Salvar / zerar o banco local | `npm run emulators:save` / `npm run emulators:reset` (fica em `.emulator-data`, fora do Git) |
| Conferir se nada quebrou | `npm run typecheck && npm test` |
