# Selos de validação

Detalhe, porquês e armadilhas: `.claude/pipeline/core/seals-reference.md`.

Selo = status de commit `pipeline/<selo>` com `success` no **SHA da cabeça do PR**. Tipos de PR: `<seals.kinds>` (globs por arquivo; PR com mais de um tipo exige a união).

| Tipo | Selos exigidos | Quem grava o selo |
| --- | --- | --- |
| todo PR | `review` | `review`: quem executa o ticket, depois do push |
| `api` | `e2e` | `e2e`: validador de API, no `APROVADO` |
| `screen`, `app` | `screen`, `ux` | `screen`: validador de tela/app, no `APROVADO` do último roteiro; `ux`: UX, no `PRONTO` |

Fallbacks: sem `seals.kinds` ou `team:` só `review`; `api` sem `team.e2e` pede `screen` no lugar de `e2e`; `ux` só com `team.roles.ux`; `app` sem `team.devices` só `review`. O validador de reserva grava o selo do papel que substitui.

Comandos (`pipeline-gate.mjs`, neste diretório):

- grava: `node .claude/pipeline/core/pipeline-gate.mjs stamp <selo> --pr <pr> --sha <sha> --evidence "…"` (`review` leva também `--report <laudo>`, com `APPROVED` e `Reviewed head: <sha>` iguais ao `--sha`);
- herda: `node .claude/pipeline/core/pipeline-gate.mjs carry <selo> --pr <pr> --from <cabeça selada>` (selo de validação, nunca `review`): grava na cabeça nova quando a cabeça selada é ancestral dela e o delta não toca tipo que exige o selo; recusa com o motivo;
- confere: `node .claude/pipeline/core/pipeline-gate.mjs check --pr <pr>` (uma linha `OK`/`MISSING` por selo, com os tipos que o exigem; sai 0 só com todos).

**Gancho de merge** (`.claude/settings.json`, só na ferramenta Bash do Claude Code): só `gh pr merge <número>` (com `rtk ` e flags simples, como `--merge`) é permitido e conferido (selos e autorização); `gh pr … merge` com flags no meio, `gh alias` com `merge` e `gh api` com rota ou mutação de merge são bloqueados; leitura que só cita a palavra (`gh pr list --state merged`, `--json mergeCommit`) passa. As formas detectadas e o risco residual (aspas, variável, mutação em arquivo) estão em `seals-reference.md`, "Lista de permissão".

**Autorização do humano**: o humano pede o merge numa mensagem curta (até 200 caracteres, sem terminar em `?`) que **abre** com o pedido (`ok`/`beleza` opcionais, depois uma palavra de pedido: `pode`, `faz`, `manda`, `segue`, `libera`… e `merge`, ou `mergear`/`mergeia`) e cujo resto é só o alvo: `#X` (lista: o PR ou as issues de fechamento dele nomeados; PR sem issue precisa ser nomeado) ou nenhum `#X` (lote: issues de fechamento do PR em `In review` no board, e todo PR sem issue de fechamento), com `tudo`, `pilha`, `3 PRs` (número solto só antes de `PRs`, `tasks`, `tickets` ou `issues`), `pra mim`, artigos e preposições. Palavra fora disso (`menos`, `depois`, `se`, `não`, `nunca`…) recusa. Exemplos: `pode mergear o #12 e o #13`, `segue com o merge da pilha`. Grava `.git/pipeline-merge-auth.json`, válido por 12 h. Só o prompt digitado grava: agente nenhum escreve nem cita o arquivo (o gancho bloqueia). Qualquer texto enviado como prompt na sessão dispara a gravação: é guarda contra etapa esquecida, não contra adversário.

Armadilhas:

- O selo é do SHA: commit novo (correção, rebase de pilha) zera os selos. Correção depois do PR passa por revisão delta `<cabeça selada>..HEAD` e selo `review` novo; cada selo de validação cujo tipo o delta não toca é herdado por `carry`, e o resto roda de novo: o roteiro reprovado, do passo reprovado até o fim mais um smoke, e qualquer outro roteiro recusado, inteiro (`.claude/skills/pipeline-maestro/SKILL.md`, seção "Achado do validador"). Pilha mergeia de baixo para cima, sem rebase.
- Texto com `gh pr merge` no mesmo comando (corpo de PR, mensagem de commit, busca) é bloqueado: passe por arquivo (`--body-file`, `git commit -F`).
- Status não se apaga: nunca grave selo para testar o script.
