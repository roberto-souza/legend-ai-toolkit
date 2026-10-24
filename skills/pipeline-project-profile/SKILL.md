---
name: pipeline-project-profile
user-invocable: false
description: |
  Carrega os fatos do repositório atual para o pipeline: lê `.claude/pipeline/profile.yml`, confere as chaves
  obrigatórias, recusa valor que o core não suporta, aplica a trava de repositório e carrega as
  extensões (`rules.md`, `ticket.md`). Toda outra skill `pipeline-*` começa por esta.
  Use quando: qualquer skill do pipeline for rodar, ou quando o usuário pedir para conferir o profile.
---

# Carregar o profile do projeto

As skills `pipeline-*` descrevem **processo**; os fatos do repositório vivem em `.claude/pipeline/`.
Esta skill é a porta de entrada: sem ela passar, nenhuma outra skill do pipeline age.

## Notação

Nas skills do pipeline, `<chave.aninhada>` é **o valor daquela chave no profile**: `<gate.final>` com `gate: { final: pnpm check }` é `pnpm check`;
`<board.statusOptions.In progress>` é o option-id do status `In progress`. Placeholder que não é chave do profile vem
descrito no próprio texto (`<n>` é o número da issue, `<scratchpad>` é o diretório de rascunho da sessão).

Detalhe: `.claude/pipeline/core/profile-schema.md` (schema com defaults e valores suportados).

## Passo 1 — Localizar e ler

1. Localize e imprima o profile:

   ```bash
   PROFILE="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}/.claude/pipeline/profile.yml"
   test -f "$PROFILE" || { echo "ABORTA: sem $PROFILE — crie o profile pelo schema em .claude/pipeline/core/profile-schema.md"; exit 1; }
   cat "$PROFILE"
   ```

2. Leia o arquivo inteiro e aplique os defaults do schema a toda chave opcional omitida.
3. Normalize: `closing` escalar é abreviação do mapa (`closing: closes-keyword` é `closing: { mode: closes-keyword }`); daqui em diante `<closing.mode>` é o modo, venha ele de qual forma vier.
4. Normalize: `branches.base` omitida é `<branches.default>`, que é `main` quando omitida.

## Passo 2 — Conferir

1. Confira toda linha das tabelas abaixo, junte todas as falhas e pare com a lista exata do que falta ou está errado, antes de qualquer outra ação. Não contorne a falha adivinhando o valor: profile incompleto se corrige no profile, não na execução.
2. A mensagem nomeia a chave (a que falta, como `team.roles.ux.audience`, ou a que guarda o valor suspeito). Nas linhas de valor suspeito (`team.credentials`, `team.e2e.users.<papel>.credentials.<nome>`, `team.e2e.login.signCommand`) a mensagem **nunca repete o valor suspeito**; as demais mensagens não têm essa regra.
3. Grupo de tabela cuja chave está ausente é pulado: sem `team:`, `team.e2e`, `team.devices`, `seals`, `review` ou `landing`, nada a conferir naquele grupo.

Topo e combinações (sempre):

| Chave | Recusa quando |
| --- | --- |
| `profileVersion` | diferente de `2`. |
| chaves obrigatórias | falta `project`, `repo`, `gate.loop`, `gate.final`, `knowledge.stackSkills` ou `knowledge.projectInstructions`; com `board` diferente de `none`, falta uma das cinco de `board`, `issues.types` ou `issues.template`. |
| qualquer chave | valor **reservado** (o schema prevê, o core ainda não trata; a lista está no schema, hoje vazia). Mensagem: "valor reservado, ainda sem suporte no core". |
| `topology: polyrepo` | sem `workspace.repos`, item sem `repo`, ou `<repo>` fora da lista. |
| `issues.titleUnit: repo` | `topology` diferente de `polyrepo`. |
| `branches.base` ≠ `branches.default` | `closing.mode` diferente de `close-references-mutation`. |
| `closing.mode: close-references-mutation` | sem `closing.workflow`. |
| `knowledge.instructionsBudget` | presente e não é inteiro positivo. |
| `language.names` | presente e não é texto não vazio. |

Detalhe: `.claude/skills/pipeline-project-profile/reference/motivos.md`, seção "Combinações obrigatórias".

`team` (só com `team:`):

| Chave | Recusa quando |
| --- | --- |
| `team.note`, `team.dev.up` | ausente. |
| `team.roles.maestro`, `team.roles.executor`, `team.roles.validatorApi`, `team.roles.validatorUi` | ausente ou sem `command`. |
| `knowledge.verification` | ausente (a orquestração do time exige o critério de verificação). |
| `team.roles.validator` | presente. Mensagem: "chave renomeada para validatorApi (profileVersion 2)". |
| `team.roles.ticketWriter`, `team.roles.validatorBackup`, `team.roles.illustrator` | presente sem `command`. |
| `team.roles.ux` | presente sem `command`, `dir` ou `audience`. |
| `team.roles.ux.siblings` | chave que não é `app` de nenhum item de `team.portals` ou `team.devices`; item de `team.roles.ux.siblings.<app>` sem `name`, `route` ou `pattern`; `name` repetido dentro do mesmo `app`. A mensagem nomeia a chave com o índice a partir de 0: `team.roles.ux.siblings.<app>[2].pattern`, `team.roles.ux.siblings.<app>[3].name`. |
| `team.portals` | vazio, ou item sem `name` ou `url`. |
| `team.credentials` | falta `file` ou `keys`; item de `keys` que não casa `^[A-Z][A-Z0-9_]*$`; `file`/`createdBy` com `=` seguido de valor, ou `:` seguido de espaço e valor (a forma `chave: valor`). Dois-pontos colado, como em `pnpm infra:up`, é nome de script e passa. |

`team.e2e` (só com `team.e2e`):

| Chave | Recusa quando |
| --- | --- |
| campos | falta `baseUrl`, `cookie`, `login.method`, `login.path`, `login.body`, ou um dos três papéis de `users` (`withPermission`, `otherRole`, `otherTenant`), cada um com `slug` e `credentials`. |
| `baseUrl` | sem `http://` ou `https://`. |
| `team.e2e.users.<papel>.credentials.<nome>` | valor que não casa `^[A-Z][A-Z0-9_]*$`; a mensagem nomeia a chave inteira, como `team.e2e.users.withPermission.credentials.cpf`. |
| slugs | `withPermission.slug` diferente de `otherRole.slug`, ou `otherTenant.slug` igual a eles; com `member` presente, `member.slug` diferente de `withPermission.slug`. |
| `login.body` | `{nome}` sem `credentials.<nome>` em algum dos três papéis, ou no `member` quando presente (`{slug}` não conta). |
| `team.e2e.users.member` | presente sem `slug`, `credentials` ou `origin`; `origin` sem `http://` ou `https://`. |
| `login.signCommand` | presente sem `{bodyFile}`; a mensagem nomeia `team.e2e.login.signCommand`. |

`team.devices` (só com `team.devices`):

| Chave | Recusa quando |
| --- | --- |
| item | sem `name`, `app`, `platform`, `formFactor`, `appId` ou `build`. |
| `platform` | fora de `ios`/`android`. |
| `formFactor` | fora de `phone`/`tablet`. |
| `build` | sem `{udid}`. |
| `name` | repetido em `team.portals` ou em outro item de `team.devices`. |
| `offline`/`online` | item com só um dos dois, ou com um deles sem `{udid}`. |

`seals` (só com `seals`):

| Chave | Recusa quando |
| --- | --- |
| `seals.kinds` | ausente; tipo fora de `api\|screen\|app` (nomeie a chave, como `seals.kinds.web`); valor que não seja lista não vazia de textos. |

`review` (só com `review`):

| Chave | Recusa quando |
| --- | --- |
| `review.proseOnly` | presente e não é lista não vazia de textos; a mensagem nomeia `review.proseOnly`. |

`landing` (só com `landing`):

| Chave | Recusa quando |
| --- | --- |
| `landing` | presente e não é mapa; falta `app` ou `handoff` (a mensagem nomeia `landing.app` ou `landing.handoff`). |
| `landing.app`, `landing.handoff` | não é texto; começa com `/` ou contém `..`; `handoff` igual a `app`. |
| `landing.widths`, `landing.sweepWidths` | presente e não é lista não vazia de inteiros positivos sem repetição. A mensagem nomeia a chave. |
| `landing.lineBudget` | presente e não é mapa; chave fora de `logic`/`section` (nomeie a chave, como `landing.lineBudget.sections`); valor que não é inteiro positivo (nomeie a chave, como `landing.lineBudget.logic`). |
| `landing.formatCommand` | presente e sem `{files}`; a mensagem nomeia `landing.formatCommand`. |
| `landing.taste` | presente e nem `default` nem caminho terminado em `.md`. |

Detalhe: `.claude/skills/pipeline-project-profile/reference/motivos.md`, seção "Landing".

## Passo 3 — Trava de repositório

1. Confira que o remote local é `<repo>` → pare se abortar:

   ```bash
   REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
   [ "$REPO" = "<repo>" ] || { echo "ABORTA: o remote local aponta para $REPO, não para <repo>"; exit 1; }
   ```

2. Com `topology: polyrepo` a trava é a mesma; o que `workspace.repos` permite: `.claude/pipeline/core/profile-schema.md`, seção "`workspace`". Detalhe: `.claude/skills/pipeline-project-profile/reference/motivos.md`, seção "Polyrepo".
3. Detalhe: `.claude/skills/pipeline-project-profile/reference/motivos.md`, seção "Trava de repositório".

## Passo 4 — Extensões

1. Leia, se existirem, os arquivos de `.claude/pipeline/` que a skill que te chamou declara usar; `<knowledge.verification>` (o critério de verificação do PR depois de aberto) está entre eles quando a chave existe. Sem `team:`, a falta dele não é falha; com `team:`, o Passo 2 já parou.
2. Extensão que contradiz uma regra dura da skill (teto de rodadas, formato do laudo, "revisor não edita"): a skill vence e você avisa o usuário da contradição. Regra: parágrafo **Extensão acrescenta regra, nunca remove gate do core.** em `.claude/pipeline/core/profile-schema.md`, seção "As extensões".

## O que fica disponível

A skill que te chamou recebe o profile com defaults e normalizações aplicados, a confirmação de que o diretório é `<repo>` e o conteúdo das extensões que existem. Diga em uma linha o que carregou e siga:

`profile <project>, <topology>, repo ok, extensões: rules.md, ticket.md, verification.md, memória: <knowledge.memories>`

A memória e a `verification.md` só entram quando declaradas.
