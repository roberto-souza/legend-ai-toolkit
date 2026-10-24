# Schema do profile — `profileVersion: 2`

- O profile é o único lugar onde o pipeline aprende os **fatos** de um repositório: `<raiz do projeto>/.claude/pipeline/profile.yml`.
- Cada chave diz se é obrigatória, o default quando omitida e os valores **suportados pelo core**.
- **Valor reservado** é o que o schema prevê e o core ainda não trata. **A lista de reservados é esta, e hoje está vazia.**
- Notação `<chave>` das skills: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Notação".
- Recusa de chave ausente, valor reservado ou combinação inválida: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".

## Topo

| Chave | Obrigatória | Default | Suportado | O que é |
| --- | --- | --- | --- | --- |
| `profileVersion` | sim | — | `2` | versão do formato; o core recusa versão que não conhece |
| `project` | sim | — | texto curto | nome do projeto, usado só em mensagens |
| `repo` | sim | — | `owner/name` | trava de repositório: `gh repo view` no diretório atual precisa bater |
| `topology` | não | `monorepo` | `monorepo` \| `polyrepo` | um repositório, ou vários repositórios sob um mesmo board |
| `closing` | não | `closes-keyword` | escalar ou mapa (ver abaixo) | como o PR vincula e fecha a issue |

## `topology`

- `monorepo`: um repositório, um board; a fronteira entre unidades de trabalho é convenção (`issues.titleUnit: app`).
- `polyrepo`: vários repositórios compartilhando um Project. Cada um tem o **próprio** `profile.yml`, com `repo` igual ao remote dele, os mesmos IDs de board e a lista dos irmãos em `workspace.repos`. Um ticket é de um repositório só.
- Demanda que atravessa repositórios: `.claude/skills/pipeline-write-ticket/SKILL.md`, seção "Fase 3 — Fatiar".

## `closing`

Duas formas, as duas válidas. A escalar é abreviação do mapa só com `mode`:

```yaml
closing: closes-keyword
```

```yaml
closing:
  mode: close-references-mutation
  workflow: <workflow que fecha a issue no merge>
```

| Chave | Obrigatória | Default | Suportado | O que é |
| --- | --- | --- | --- | --- |
| `mode` | não | `closes-keyword` | `closes-keyword` \| `close-references-mutation` | como o PR fica vinculado à issue e como a issue fecha |
| `workflow` | com `close-references-mutation` | — | caminho | workflow do repositório que fecha a issue no merge na base |

- `closes-keyword`: a base do PR **é** a branch default; o `Closes #N` do corpo vincula o PR à issue e a fecha no merge.
- `close-references-mutation`: a base **não** é a branch default, então o GitHub ignora a keyword. Uma mutation, rodada logo depois do `gh pr create`, grava o vínculo; o workflow de `<closing.workflow>` fecha a issue no merge. O `Closes #N` continua obrigatório no corpo do PR, porque o workflow o lê.
- A mutation: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Com `closing: close-references-mutation`, grave o vínculo".
- `close-references-mutation` sem `workflow`: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".

## `workspace`

| Chave | Obrigatória | Default | O que é |
| --- | --- | --- | --- |
| `repos` | com polyrepo | — | os repositórios que compartilham o board, **este inclusive**, um por item |

Cada item:

| Chave | Obrigatória | Default | O que é |
| --- | --- | --- | --- |
| `repo` | sim | — | `owner/name`, como o `gh repo view` devolve |
| `dir` | não | nome curto de `repo` | diretório do checkout, **relativo ao diretório-pai** deste checkout |
| `unit` | não | nome curto de `repo` | o que vai entre colchetes no título do ticket, com `issues.titleUnit: repo` |

```yaml
topology: polyrepo
workspace:
  repos:
    - { repo: <owner>/<server repo>, dir: <checkout dir>, unit: <short name> }
    - { repo: <owner>/<client repo> }
```

- Lido **só** com `topology: polyrepo`; com `monorepo` é ignorado.
- `dir` é relativo ao pai porque o profile é versionado e caminho absoluto morre na máquina seguinte; declare-o quando o diretório do clone não for o nome curto do repositório.
- A lista é a mesma nos profiles de todos os irmãos: o `pipeline-execute-ticket` tira dela o diretório de uma issue de outro repositório, e o `/pipeline-doctor` a confere contra os remotes.
- **Nenhum comando do pipeline escreve num repositório irmão**: a lista serve para ler, apontar e recusar.
- Obrigatória com polyrepo: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".

## `branches`

| Chave | Obrigatória | Default | Suportado | O que é |
| --- | --- | --- | --- | --- |
| `default` | não | `main` | nome de branch | branch default do GitHub |
| `base` | não | `default` | nome de branch | base de toda branch e todo PR |

- Combinação: `base` diferente de `default` **exige `closing.mode: close-references-mutation`**; a recusa e o motivo estão em `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".
- **O executor nunca abre PR contra `<branches.default>`** quando as duas diferem: a default costuma ser a branch de release, e um PR contra ela dispara deploy.

## `board`

| Chave | Obrigatória | O que é |
| --- | --- | --- |
| `owner` | sim | org ou usuário dono do Project |
| `number` | sim | número do Project (`github.com/orgs/<owner>/projects/<number>`) |
| `projectId` | sim | node id do Project (`PVT_...`) |
| `statusField` | sim | node id do campo Status (`PVTSSF_...`) |
| `statusOptions` | sim | mapa nome → option-id para `Backlog`, `Ready`, `In progress`, `In review`, `Done` |

- `board: none` é válido e desliga tudo que toca Project (repositório sem Project).
- Os cinco nomes de status são contrato do pipeline: o board precisa tê-los com essa grafia exata.

## `issues`

| Chave | Obrigatória | Default | Suportado | O que é |
| --- | --- | --- | --- | --- |
| `types` | com board | — | mapa `Type` → prefixo | tipos de issue da org e o prefixo de branch/commit de cada um |
| `label` | não | `ticket` | nome de label | label do fluxo |
| `template` | com board | — | caminho | issue form cujos cabeçalhos o corpo do ticket reproduz |
| `titleUnit` | não | `app` | `app` \| `repo` | o que vai entre colchetes no título do ticket |
| `milestone` | não | `required` | `required` \| `optional` | se todo ticket precisa de milestone |

- Obrigatório quando `board` não é `none`. Sem board o repositório não trabalha por ticket: `pipeline-execute-ticket` e `pipeline-write-ticket` param, e só o `pipeline-review-diff` roda.
- Em `types`, um tipo com mais de um prefixo usa lista: `Task: [chore, docs, refactor]`.
- `titleUnit: repo`: a unidade é o repositório e o título leva o `unit` do item de `workspace.repos`. `titleUnit: app`: a unidade é a convenção interna descrita no `ticket.md`.
- Combinação: `titleUnit: repo` **exige `topology: polyrepo`**; a recusa está em `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir", e a regra de uma issue por repositório em `.claude/skills/pipeline-write-ticket/SKILL.md`, seção "Fase 3 — Fatiar".

## `gate`

| Chave | Obrigatória | Default | Suportado | O que é |
| --- | --- | --- | --- | --- |
| `loop` | sim | — | comando | gate do laço interno, escopado ao que mudou |
| `final` | sim | — | comando | gate inteiro, rodado uma vez antes do push |
| `tests` | não | `true` | `true` \| `false` | se o repositório tem suíte de testes |
| `ci` | não | `none` | `none` \| `checks` | se o PR tem checks de CI para acompanhar |
| `secretScan` | não | — | `arquivo#seção` | ponteiro para onde está o comando de varredura de segredos |

- `loop` e `final` continuam obrigatórios com `tests: false`; num repositório sem suíte eles são o lint, o typecheck e o formato.
- `tests: false` muda o que é evidência, não o rigor: o critério de aceite e cada cenário da spec são verificados **percorrendo o comportamento**, com evidência em arquivo:linha ou no que se vê na tela. BLOCKER corrigido não ganha teste de regressão, porque não há onde escrever.
- `ci: checks` acrescenta à Fase 7 do `pipeline-execute-ticket` o acompanhamento do CI (`gh pr checks <pr> --watch`); check vermelho volta para a Fase 4.
- **CI não substitui o `<gate.final>` local da Fase 6**: descobrir a quebra no runner custa um ciclo inteiro.

## `language`

| Chave | Obrigatória | Default | O que é |
| --- | --- | --- | --- |
| `artifacts` | não | `en` | idioma de código, commit, branch, issue, PR, comentário e laudo |
| `conversation` | não | `pt` | idioma da conversa com o usuário |
| `names` | não | — | idioma de nomes de pasta, arquivo e branch, com o valor que o projeto escolher; ausente = o pipeline não cobra idioma de nome |

- Com `names`, o nome da branch segue `names`, não `artifacts`.
- Quem cobra `names`: o revisor, nos caminhos novos do diff e na branch (`.claude/skills/pipeline-review-diff/SKILL.md`, seção "O que procurar, em ordem de importância"). O core não impõe idioma de nome nem tem guard por script para ele.

## `knowledge`

| Chave | Obrigatória | O que é |
| --- | --- | --- |
| `stackSkills` | sim | lista de `{paths: [globs], skill: <nome>}`; `[]` é válido. Ver as duas formas de `skill` abaixo |
| `moduleMaps` | não | índice dos module maps; ausente = o repo não usa module maps |
| `adrs` | não | pasta de ADRs |
| `projectInstructions` | sim | arquivo de instruções do repo (normalmente `CLAUDE.md`) |
| `memories` | não | índice da memória versionada do projeto (fatos de processo que não cabem em ADR nem nas instruções); ausente = o repositório não tem memória versionada |
| `verification` | não | arquivo com o critério de verificação de PR; ausente = nenhum critério além da revisão e do gate. Notação `<knowledge.verification>`. Opcional para o core |
| `instructionsBudget` | não | teto, em bytes, de `<knowledge.projectInstructions>`; ausente = sem teto. O guard `node .claude/pipeline/core/document-budget.mjs` entra no `<gate.final>` do projeto. Regra: `.claude/pipeline/core/format.md`, seção "Arquivo de instruções do projeto" |

- `verification` é obrigatória com `team:`: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".
- Memória é contexto, não instrução: fato do repositório (código, ADR, `<knowledge.projectInstructions>`) vence memória defasada.

### As duas formas de `stackSkills[].skill`

| Forma | Exemplo | Onde a skill mora |
| --- | --- | --- |
| **local** | `<stack skill name>` | `.claude/skills/<skill>/SKILL.md`, no próprio repositório |
| **namespaced** | `<plugin>:<stack skill name>` | num plugin `<plugin>`, instalado e habilitado neste projeto |

- O dois-pontos distingue as duas, e é nele que quem carrega ramifica.
- Local: leia o arquivo `.claude/skills/<skill>/SKILL.md`.
- Namespaced: invoque a skill pelo nome (`<plugin>:<skill>`) com a ferramenta `Skill`, em vez de ler um caminho.
- A forma namespaced serve à stack skill que é a mesma em vários repositórios e por isso foi centralizada num plugin.
- **O que cada skill faz quando não consegue carregar é dela**, e está escrito nela.
- Plugin habilitado e skill existente: `.claude/skills/pipeline-doctor/SKILL.md`, item 15.

## `security`

| Chave | Obrigatória | Default | O que é |
| --- | --- | --- | --- |
| `diffGate` | não | `true` | kill switch do revisor de segurança no gate do `/pipeline-execute`, por repo |
| `baseline` | com `security.md` | — | arquivo de riscos aceitos que o `pipeline-security-audit` consulta |

- Opcional para o schema.
- `security.md` e baseline enquanto o gate estiver ligado: `.claude/skills/pipeline-doctor/SKILL.md`, item 18.

## `team`

- Opcional. Ausente = o repositório não orquestra o time e a skill `pipeline-maestro` para; só ela lê a chave, além do `resume` do gate.
- Com `team:`, o `install.mjs` do toolkit mescla o gancho `SessionStart` de matcher `compact`, que roda `pipeline-gate.mjs resume`: depois de uma compactação, a sessão lê "se você é o orquestrador do time, leia a nota `<team.note>` antes de agir". Sem `team:`, o install não põe o gancho e tira o que tiver posto. Conferência: `.claude/skills/pipeline-doctor/SKILL.md`, item 28.
- Recusas: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".
- Conferências ao vivo (arquivo `.example`, `git check-ignore`, cobertura das chaves de credencial): `.claude/skills/pipeline-doctor/SKILL.md`, item 23.

```yaml
team:
  note: <nome da nota de estado no canvas>
  roles:
    maestro: { tool: claude-code, model: <id>, command: <comando que sobe o terminal> }
    executor: { tool: claude-code, model: <id>, command: <comando> }
    validatorApi: { tool: <ferramenta>, effort: <esforço>, command: "<comando com {root} no lugar da raiz do checkout>" }
    validatorUi: { tool: <ferramenta>, model: <id>, command: "<comando que sobe o validador de tela; {root} no lugar da raiz do checkout>" }
    ticketWriter: { tool: claude-code, model: <id>, command: <comando que sobe o escritor de tickets> }
    ux:
      tool: <ferramenta>
      model: <id>
      command: "<comando que sobe a especialista de UX; {root} no lugar da raiz do checkout>"
      dir: <pasta das capturas, relativa à raiz do checkout principal>
      audience: <quem usa as telas, em uma frase>
      siblings:
        <app>:
          - { name: <nome curto em kebab-case>, route: "<caminho no app; :param vira id real>", pattern: <rótulo do padrão> }
    validatorBackup: { tool: <ferramenta>, effort: low, command: "<comando que sobe o validador de reserva; {root} no lugar da raiz do checkout>" }
    illustrator: { tool: <ferramenta>, model: <id>, command: "<comando que sobe o ilustrador; {root} no lugar da raiz do checkout>" }
  dev:
    infraRequires: <pré-requisito humano, ex.: Docker ligado>
    infra: <comando que sobe a infra local>
    migrate: <comando>
    seed: <comando>
    up: <comando que sobe os apps>
    appUp: <comando que sobe o bundler do app móvel>
  portals:
    - { name: <nome do portal>, app: <unidade>, url: "<URL com {slug} quando o host leva o tenant>" }
  devices:
    - { name: <nome do portal de aparelho>, app: <unidade>, platform: ios | android, formFactor: phone | tablet, appId: <bundle id ou package>, build: "<comando com {udid}>", offline: "<comando com {udid}>", online: "<comando com {udid}>" }
  credentials:
    file: <arquivo local, nunca versionado>
    keys: [<NOME_DE_VARIAVEL>]
    createdBy: <comando que cria a credencial>
  e2e:
    baseUrl: <URL da API em dev, http:// ou https://>
    cookie: <nome do cookie de sessão que o login devolve>
    login:
      method: <POST>
      path: <rota do login>
      headers: { <Cabeçalho>: "<valor; {slug} é o tenant do usuário>" }
      body: { <campo>: "{<nome da credencial>}", ... }
      signCommand: "<comando com {method}, {path} e {bodyFile} que imprime no stdout as linhas de cabeçalho que assinam o login>"
    users:
      withPermission: { slug: <tenant>, credentials: { <nome>: <VARIAVEL>, ... } }
      otherRole: { slug: <tenant>, credentials: { <nome>: <VARIAVEL>, ... } }
      otherTenant: { slug: <tenant>, credentials: { <nome>: <VARIAVEL>, ... } }
      member: { slug: <tenant>, credentials: { <nome>: <VARIAVEL>, ... }, origin: "<valor do cabeçalho Origin do login deste papel>" }
```

| Chave | Obrigatória | Default | O que é |
| --- | --- | --- | --- |
| `note` | sim | — | nota de estado que o maestro mantém no canvas |
| `roles.maestro`, `roles.executor`, `roles.validatorApi`, `roles.validatorUi` | sim, os quatro | — | um mapa por papel; o validador de API roda o roteiro E2E em `curl` dos PRs de API e não usa portal; o validador de tela confere as capturas do executor, faz os passos pontuais de portal dos PRs de tela e cria os portais |
| `roles.ticketWriter` | não | ausente = o maestro não recruta escritor | escritor de tickets recrutado sob demanda para a fase 1 |
| `roles.ux` | não | ausente = o maestro não valida UX, nem os PRs de tela, nem os de API sem `team.e2e`, que gravam as capturas em `roles.ux.dir` | especialista de UX recrutada no setup |
| `roles.ux.command`, `roles.ux.dir`, `roles.ux.audience` | sim, com `roles.ux` | — | o comando; a pasta das capturas, relativa à raiz do checkout principal, uma subpasta `pr-<n>/` por PR, ignorada pelo git; o público das telas, que o maestro resolve em `.claude/skills/pipeline-maestro/roles/ux.md` |
| `roles.ux.siblings` | não | ausente = a UX recebe só as telas do PR | telas irmãs por unidade, capturadas como referência de consistência. Chave do mapa: um `app` de `portals` ou `devices`. Item: `name` (kebab-case, nome do arquivo da captura, único no mesmo `app`), `route` (caminho no app), `pattern` (rótulo curto: `list`, `detail`, `form`, `panel`, `login`; texto livre que só precisa se repetir entre irmãs do mesmo `app` para agrupá-las). Detalhe: `.claude/pipeline/core/ux-reference.md`, seção "Seleção das irmãs" |
| `roles.validatorBackup` | não | ausente = validador sem cota → o maestro para e avisa o usuário | substitui o validador de API ou o de tela quando ficam sem cota |
| `roles.illustrator` | não | ausente = o fluxo de landing pede a imagem ao humano | ilustrador recrutado pela skill de landing, sem selo; não é papel de PR. Detalhe: `.claude/skills/pipeline-maestro/reference/ilustrador.md`, seção "Recrutar o ilustrador" |
| `dev.up` | sim | — | sobe os apps |
| `dev.infraRequires`, `dev.infra`, `dev.migrate`, `dev.seed` | não | ausente = o passo não existe no repositório | pré-requisito humano e comandos de infra, migration e seed locais |
| `dev.appUp` | não | ausente = o `build` de cada aparelho basta | sobe o bundler do app móvel no checkout principal |
| `portals` | sim, não vazio | — | portais que o validador de tela abre |
| `devices` | não | ausente = o maestro não valida PR de app | portais de aparelho do PR de app, criados pelo validador de tela |
| `credentials.file` | sim | — | arquivo local de onde a credencial de teste é lida; ignorado pelo git; um `<credentials.file>.example` versionado declara os nomes de variável |
| `credentials.keys` | sim | — | nomes de variável dentro de `file` (`^[A-Z][A-Z0-9_]*$`) |
| `credentials.createdBy` | não | — | comando que cria a credencial no ambiente local |
| `e2e` | não | ausente = o maestro não valida PR de API por E2E | roteiro E2E dos PRs de API |
| `e2e.baseUrl`, `e2e.cookie`, `e2e.login.method` | sim, com `e2e` | — | URL da API em dev (`http://` ou `https://`), nome do cookie de sessão e método do login |
| `e2e.login.path`, `e2e.login.body` | sim, com `e2e` | — | rota do login e corpo dele, com `{nome}` resolvido por `credentials` |
| `e2e.users.withPermission`, `otherRole`, `otherTenant` | sim, com `e2e` | — | os três papéis do E2E, cada um com `slug` e `credentials` (mapa `nome → NOME_DE_VARIAVEL`, lido de `credentials.file`; toda variável citada ali também consta em `credentials.keys`) |
| `e2e.users.member` | não | ausente = o roteiro não tem rota do front desse papel | papel opcional do usuário final do tenant, sem cargo de gestão, que entra por um front próprio; com `slug`, `credentials` e `origin` |
| `e2e.login.headers` | não | — | cabeçalhos do login; `{slug}` é o tenant do papel |
| `e2e.login.signCommand` | não | ausente = login sem assinatura | imprime no stdout as linhas de cabeçalho (`Nome: valor`, uma por linha) que assinam a requisição de login |

Formato de cada item:

- Papel (os quatro obrigatórios, e `roles.ticketWriter`, `roles.ux`, `roles.validatorBackup` e `roles.illustrator` quando presentes): `command` obrigatório; no validador de API, no de tela, na UX, no de reserva e no ilustrador, o `command` pode levar `{root}`; `tool` (`claude-code` \| `codex` \| `antigravity`, informativo) e `effort` opcionais; `model` opcional (em `roles.ux` também), e a ausência significa "não conferir o modelo".
- Portal: `name` e `url` (`http://` ou `https://`) obrigatórios; `app` opcional (unidade de `issues.titleUnit`).
- Aparelho: `name` (não repete nenhum `name` de `portals`), `app`, `platform` (`ios` \| `android`), `formFactor` (`phone` \| `tablet`), `appId` e `build` (com `{udid}`) obrigatórios; `offline` e `online` opcionais, sempre juntos e com `{udid}`: cortam e devolvem a rede **do aparelho** (o app tem de ver a rede cair; derrubar a API não serve); ausentes = o cenário offline não se aplica àquele aparelho.

Nenhum placeholder da tabela abaixo é a notação `<chave>` do pipeline: quem usa (a skill `pipeline-maestro`) os resolve na hora.

| Placeholder | Onde | O que é |
| --- | --- | --- |
| `{root}` | `roles.validatorApi.command`, `roles.validatorUi.command`, `roles.ux.command`, `roles.validatorBackup.command`, `roles.illustrator.command` | raiz do checkout principal, que quem recruta o papel (o maestro; no ilustrador, a skill de landing) troca ao recrutá-lo (`git rev-parse --show-toplevel`, no Ground) |
| `{slug}` | `portals[].url`, `e2e.login.headers`, `e2e.login.body` | identificador do tenant quando o host o carrega; em `e2e`, o `slug` do papel |
| `{<nome da credencial>}` | `e2e.login.body` | valor da variável em `credentials.<nome>` do papel que faz o login |
| `{method}`, `{path}` | `e2e.login.signCommand` | `e2e.login.method` e `e2e.login.path` |
| `{bodyFile}` | `e2e.login.signCommand` | caminho **absoluto** do arquivo com os bytes exatos do corpo do login (absoluto porque o comando pode rodar em outro diretório); a assinatura cobre o corpo, e comando que não lê os bytes enviados assina outra coisa. Caminho concreto: `.claude/skills/pipeline-maestro/SKILL.md`, seção "Validação de API por E2E" |
| `{udid}` | `devices[].build`, `offline`, `online` | id do aparelho, que o validador de tela lê de `maestri portal info` e o maestro registra na nota |
| `:<param>` | `roles.ux.siblings[].route` | o maestro o troca, ao escrever o roteiro, por um id real de registro do tenant de teste (o slug de `## Decisões` quando o parâmetro é o slug) |

Num mapa YAML inline (`{ ... }`), valor com `{` vai entre aspas.

- **Valor de credencial nunca entra no profile**: só o nome do arquivo e os nomes de variável. A recusa de valor que pareça segredo: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".
- **Os três papéis são contrato do core.** `withPermission` prova caminho feliz, 400, 404 e 409; `otherRole` é o **mesmo tenant** de `withPermission`, com sessão e cargo vigente **com outras chaves**, nunca "sem permissão", e prova o 403 (o ticket de API diz, no roteiro, qual cargo semeado prova o 403 daquela rota quando não é o do `otherRole`); `otherTenant` é **outro tenant** e prova o isolamento (usuário com permissão em **outro** tenant recebe 404 nos recursos do primeiro, nunca 200 nem 403).
- **O papel opcional `member`** é o usuário final do tenant que entra por um front cuja origem não carrega o tenant no host. Seu login usa `login.method`, `login.path` e `login.body` do `e2e`, com o cabeçalho `Origin` trocado por `member.origin` (sem `{slug}`). `origin` começa com `http://` ou `https://`; `member.slug` é o tenant do usuário e é igual a `withPermission.slug`; todo `{nome}` do `login.body` existe em `member.credentials`, e toda variável de `member.credentials` também consta em `credentials.keys`.
- Floor, caminho de clone, nome de portal já criado no canvas e id de aparelho são fato da máquina, não do repositório, e não têm chave.

## `seals`

- Opcional. `kinds` mapeia o tipo de PR (`api`, `screen`, `app`) a uma lista não vazia de globs relativos à raiz; ausente = todo PR exige só `review`.
- Contrato (selos exigidos por tipo, quem carimba, reservas): `.claude/pipeline/core/seals.md`. Tipo fora desses três: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".

```yaml
seals:
  kinds: { api: ['<glob>'], screen: ['<glob>'], app: ['<glob>'] }
```

## `review`

| Chave | Obrigatória | Default | Suportado | O que é |
| --- | --- | --- | --- | --- |
| `proseOnly` | não | ausente | lista não vazia de globs relativos à raiz | arquivos que contam como prosa: diff do ticket inteiro dentro deles roda o `pipeline-reviewer` em `sonnet`; ausente = o revisor roda sempre no modelo do frontmatter do agent |

- Opcional. Quem consulta: `node .claude/pipeline/core/pipeline-gate.mjs prose --range <range>`, que imprime uma linha e sai 0: `PROSE-ONLY` (diff não vazio e todo arquivo casa algum glob), `NOT PROSE-ONLY: <primeiro arquivo que não casa>`, `NOT PROSE-ONLY: review.proseOnly not declared` ou `NOT PROSE-ONLY: empty diff`. Valor inválido: `error: …` e saída 1.
- No `path.matchesGlob` do Node, `*` e `**` não entram em diretório cujo nome começa com ponto (`.claude/`, `.github/`): para cobri-los, o glob nomeia o ponto (`.*/**/*.md`) ou o diretório.
- Onde a decisão é tomada (range do ticket inteiro, gatilho de segurança, revisor de segurança sem override): `.claude/skills/pipeline-execute-ticket/SKILL.md`, seção "Fase 5 — Gate de revisão, antes de existir PR".
- Valor inválido: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".

```yaml
review:
  proseOnly: ['<glob>']
```

## `landing`

- Opcional. Ausente = módulo de landing desligado, e nada muda no projeto. Presente = módulo ligado, e `app` e `handoff` são obrigatórias dentro dele.
- Todo caminho é relativo à raiz do repositório e não contém `..`: o profile é versionado, e caminho absoluto morre na máquina seguinte (a mesma razão de `workspace.repos[].dir`).
- Os fatos em prosa (produto, público, ação, proibições, fontes, hospedagem, descoberta) vivem na extensão `landing.md`, descrita em seção "As extensões", abaixo.
- Recusas: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir". Conferências ao vivo (extensão, diretórios, `taste` por caminho): `.claude/skills/pipeline-doctor/SKILL.md`, item 27.

```yaml
landing:
  app: <caminho do app da página>
  handoff: <diretório do handoff do protótipo>
  # widths: [390, 1440]
  # sweepWidths: [320, 360, 390, 414, 600, 768, 1024, 1280, 1440, 1920]
  # lineBudget: { logic: 400, section: 1000 }
  # formatCommand: <comando do formatador> {files}
  # taste: default   # ou <arquivo .md do projeto>, que substitui o padrão
```

| Chave | Obrigatória | Default | Suportado | O que é |
| --- | --- | --- | --- | --- |
| `landing.app` | sim, com `landing` | — | caminho relativo à raiz | diretório do app da página no repositório |
| `landing.handoff` | sim, com `landing` | — | caminho relativo à raiz, diferente de `app` | diretório onde o handoff do protótipo vive (briefing, protótipo, copy, manifesto); pode estar no `.gitignore` |
| `landing.widths` | não | `[390, 1440]` | lista não vazia de inteiros positivos, sem repetição | larguras fixas (em px) da rubrica, no protótipo e na página construída |
| `landing.sweepWidths` | não | `[320, 360, 390, 414, 600, 768, 1024, 1280, 1440, 1920]` | lista não vazia de inteiros positivos, sem repetição | larguras da varredura de sobreposição e de rolagem horizontal, no protótipo e na página construída |
| `landing.lineBudget` | não | `{ logic: 400, section: 1000 }` | mapa só com `logic` e `section`, inteiros positivos; chave omitida assume o default dela | teto de linhas **por arquivo**: `logic` para arquivo de lógica (script, hook, utilitário), `section` para arquivo de seção da página (marcação e estilo). Contado **depois** do `formatCommand` |
| `landing.formatCommand` | não | ausente | texto com `{files}` | comando que formata arquivos do projeto; `{files}` vira a lista de arquivos. Ausente = a contagem de linhas é feita sem formatar, e o ticket de landing diz isso |
| `landing.taste` | não | ausente | `default` ou caminho terminado em `.md` | ausente = sem taste; `default` = o `taste` padrão do core (em `.claude/pipeline/core/landing/`); caminho = arquivo do projeto que **substitui** o padrão por inteiro |

- `lineBudget` é teto por arquivo e não muda o corte de tamanho do ticket do fluxo de tickets: seção que passa desse corte vira dois tickets.
- `{files}` não é a notação `<chave>` do pipeline: quem formata o troca, na hora, pela lista de arquivos.
- Os modelos do módulo vêm com o core, em `.claude/pipeline/core/landing/`: briefing, validação, manifesto do handoff, contexto de tickets, checklist de descoberta e o `taste` padrão. A skill de landing copia os moldes para `<landing.handoff>`, e o projeto preenche a cópia; o checklist e o `taste` não se copiam.

## As extensões

Ao lado do `profile.yml`, em `.claude/pipeline/`, vivem as extensões em prosa; todas opcionais para o schema, e cada skill diz quais lê e o que faz quando falta.

| Arquivo | Lido por | Conteúdo |
| --- | --- | --- |
| `rules.md` | `pipeline-execute-ticket`, `pipeline-review-diff` | regras do repositório que a ferramenta não pega, com a severidade de cada uma na revisão |
| `ticket.md` | `pipeline-write-ticket` | fatiamento, arestas de colisão, perguntas de domínio, exemplos |
| `security.md` | `pipeline-security-audit`, `pipeline-execute-ticket` (gatilho) | perfis de atacante, threat model com ponteiros, eixos do sweep, `## Triggers`; com o eixo opt-in `supply-chain`, a seção `## Supply chain` (comandos e arquivos que o eixo lê) |
| `verification.md` | `pipeline-maestro` | critério de verificação do PR depois de aberto: API, tela, app (com `team.devices`), nota de UX, PR sem tela nem rota; o `pipeline-execute-ticket` o cita na Fase 7 |
| `landing.md` | o módulo de landing (opt-in; existe só com `landing:` no profile, e então o `/pipeline-doctor` a exige) | sete seções `##` fixas, nesta ordem: `## Produto`, `## Público`, `## Ação` (rótulos **Ação única** e **Canal**), `## Proibições`, `## Fontes` (rótulos **Spec**, **Protótipo** e **Copy**; a hierarquia entre eles é regra do core), `## Hospedagem` (rótulos **CDN**, **Analytics** e **Bordas**) e `## Descoberta` (respostas do checklist de descoberta, preenchidas no fluxo de landing) |

**Extensão acrescenta regra, nunca remove gate do core.** Um `rules.md` não pode desligar o teto de rodadas nem mudar o formato do laudo, e um `security.md` não pode
relaxar a regra de prova. O único interruptor declarado é `security.diffGate`.

Severidade de um princípio do core num `rules.md`: `.claude/pipeline/core/principles.md`, seção "O repositório ajusta a severidade, nunca o texto".

## Mudança de formato

**`profileVersion` sobe quando um profile que era válido deixa de ser aceito pelo `pipeline-project-profile`** — chave
obrigatória nova, valor que muda de significado, chave removida. Chave nova nasce opcional, com default nesta página, e
não sobe a versão. O core e o profile vivem no mesmo repositório: a mudança de um e o ajuste do outro vão no mesmo PR.

- **Versão 2 (2026-10-05).** `team.roles.validator` virou `team.roles.validatorApi`, e `team.roles.validatorUi`
  nasceu obrigatória. Profile com `team.roles.validator`: `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir".
