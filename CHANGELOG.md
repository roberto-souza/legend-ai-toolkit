# Changelog

Semver: quebra do contrato do profile sobe o major; skill, regra ou chave opcional nova sobe o minor; correção sobe o patch. Cada versão diz o que o projeto precisa fazer ao atualizar.

## 0.8.0 — 2026-11-18

**Validação de tela sem retrabalho de evidência (com `team.capture`).** O que ainda custava voltas na 0.7.1 não era defeito do app: cenário sem o dado que o prova, descrição que afirmava o que a captura não mostrava, foto antes de a tela carregar, laudo perdido com a sessão limpa, entrega que o sentinela não via, leitura grande demais para uma sessão e mensagem ao leitor escrita à mão, com juízo.

- **Executor** (`roles/executor.md`, seção "Pedido de capturas pela ferramenta"):
  - a descrição do cenário (`expected`) diz só o que a captura mostra, nunca o critério nem um juízo;
  - todo critério de tela tem, na mesma captura, o dado que o prova, um caso de cada estado. Falta → o executor cria pelo próprio app, só no tenant de teste do pedido, e registra em `<pasta>/dados-criados.md`, que a ferramenta não apaga;
  - critério de URL ou parâmetro leva a medida `url`; toda navegação leva `waitFor` da tela de destino;
  - a linha `CAPTURAS PRONTAS: PR #<pr> rodada <k> <sha> — <q> capturas — <pasta> — pedido <id>` é obrigatória e começa a linha.
- **Contrato** (`core/capture.md`): `waitFor` no cenário (tela da rota) e em `click`/`press` que navegam, `fullPage: false` (só a janela, para cabeçalho preso) e a seção "Espera antes da foto": a ferramenta espera o fim das animações (`document.getAnimations()`, sem as infinitas) antes de cada foto, sem `finish()`. O `medidas.json` passa a ser o último arquivo gravado. Sem `waitFor`, a ferramenta segue como hoje.
- **Leitor** (`roles/ux.md`, seção "Leitura única"): grava o laudo de tela e o de UX completos no arquivo que a mensagem dá antes de responder, e a resposta repete só as linhas fixas. Acima de 80 imagens, a leitura vai em partes, cada uma numa sessão limpa, e a última junta os laudos, a média e o `APROVADO`.
- **Mensagem gerada** (`skills/pipeline-maestro/maestro-ux-message.mjs`): sai de `medidas.json`, `cenarios.json`, `dados-criados.md`, das telas tocadas pelo diff e das seções `## Decisions`, `## Sugestões futuras…` e `--section <título>` do corpo do PR, copiadas sem mudar. Apaga as mensagens e os laudos antigos da pasta. Nunca diz o que entrou, o que é ou não bloqueio, nem a severidade.
- **Fila do leitor** (`skills/pipeline-maestro/maestro-ux-queue.sh`): recebe `<pr>:<rodada>`, faz uma leitura por vez (trava por pasta, com espera por pid), manda `/clear`, o papel e cada parte, grava um log por parte e imprime `enviado` e `fim — laudo <arquivo>` por PR. Cada parte precisa deixar o seu laudo; laudo ausente para a fila ali, para o maestro responder a pergunta do leitor na mesma sessão, e rodar a fila de novo pula as partes já respondidas.
- **Sentinela** (`maestro-sentinel.sh`): o argumento `<id>@<epoch>=<pasta>` também vigia o `medidas.json` da pasta e imprime `MEDIDAS PRONTAS: pedido <id> — <arquivo>` quando ele é gravado no `<epoch>` do pedido ou depois, mesmo no primeiro poll (sem `@<epoch>`, quando muda depois do arme). Cada id sai uma vez, pelo evento que chegar primeiro. O argumento só `<id>` segue como antes.
- **Régua de UX** (`core/ux-reference.md`, seção "Âncoras da nota", só com `team.capture`): o que é 6, 7, 8 e 9 em Funcionalidade, Utilidade e Beleza, com exemplo genérico. Melhoria já registrada nas sugestões futuras, ou contrária a decisão registrada, não baixa a nota de novo.
- Specs novas: `tests/maestro-ux.test.mjs` (mensagem e fila) e os casos de `medidas.json` em `tests/maestro-sentinel.test.mjs`; `tests/capture.test.mjs` confere as regras novas e o gate por `team.capture`.

**Ao atualizar:** sem `team.capture`, nada muda. Com a chave:
1. libere `.claude/skills/pipeline-maestro/maestro-*` no `.claude/settings.local.json` do maestro (antes só o sentinela);
2. na ferramenta de captura do projeto, implemente `waitFor` no cenário e na ação que navega, `fullPage: false` e a espera do fim das animações, e grave o `medidas.json` por último (sem `waitFor` nos cenários, ela segue como hoje);
3. rode o `/pipeline-doctor`.

## 0.7.1 — 2026-11-17

**Correção: SKILL.md grandes demais para a guarda de tamanho de documentação do projeto.** Na 0.7.0 o `skills/pipeline-doctor/SKILL.md` passou de 28000 bytes, e o `pipeline-maestro` e o `pipeline-execute-ticket` estavam perto. O detalhe foi para o `reference/` de cada skill, lido sob demanda, sem mudança de comportamento:

- **`/pipeline-doctor`** (28266 → 22998 bytes): os blocos de comando dos itens 27 (landing) e 30 (triagem) vão para `reference/comandos.md`, seções "Landing (item 27)" e "Triagem (item 30)", iguais aos de antes. Os itens apontam para elas; as regras, os estados e o item 23 (`team.capture`) não mudam.
- **`pipeline-maestro`** (27848 → 26033 bytes): os passos de "Validação PR a PR" vão para `reference/validacao-tela.md`, a revalidação parcial do "Achado do validador" para `reference/despacho.md`, seção "Revalidação parcial", e os passos 6 a 8 da "Nota de estado" para `reference/nota-de-estado.md`.
- **`pipeline-execute-ticket`** (26772 → 25876 bytes): os passos 3 a 6 da "Revisão delta (correção depois do PR)" vão para `reference/review-gate.md`, seção "Revisão delta: passos".
- Spec nova: `tests/skill-size.test.mjs` mantém todo `skills/*/SKILL.md` pelo menos 1500 bytes abaixo de 28000. O teto não é chave do profile: a guarda é regra do projeto.

**Ao atualizar:** só mudam arquivos de `skills/` (e o lock). O profile e as extensões não mudam. Rode o `/pipeline-doctor`: ele confere o mesmo que na 0.7.0.

## 0.7.0 — 2026-11-17

**Validação de tela mais rápida e mais certeira, com a ferramenta de captura do projeto (opt-in).** A tela passa a ter o que a API já tem: medidas que reprovam sozinhas, uma ferramenta de captura reaproveitável, uma leitura visual só e validação PR a PR. Os dois selos continuam, e quem os grava continua sendo um agente de contexto limpo, nunca o executor.

- **Chave opcional `team.capture.command`**, com `{scenarios}`, `{sha}`, `{out}` e `{root}`. O contrato fica em `core/capture.md`, e cada projeto implementa a ferramenta, versionada no repositório dele (não é spec nem roda no `check`):
  - arquivo de cenários em JSON (`<pasta>/cenarios.json`): `id`, app, rota, viewport, tema, ações (`click`, `fill`, `waitFor`, `press`, `route` com atraso ou `abort`), o que fotografar, estado transitório, medidas e erros de console esperados;
  - saída: os PNG, o `capturas.md` no formato de linha de hoje e o `medidas.json`, com valor, limite e `OK` ou `FALHA` por medida;
  - medidas: alvo de toque, contraste, estouro (`scrollWidth > clientWidth`), `aria-*` e nome acessível, URL e parâmetros, console e sobreposição.
- **Executor** (`roles/executor.md`, seção "Pedido de capturas pela ferramenta"): escreve só o arquivo de cenários, a partir das linhas `— verify:` e dos cenários "(verificação)" do ticket, e roda o comando.
- **Medida com `FALHA` reprova o PR sem leitura visual.** A UX só confirma que a captura sustenta a medida (`roles/ux.md`, seção "Confirmação de medida"), e o caminho é o de "Achado do validador".
- **Varredura pelo diff** (`reference/captura.md`, seção "Varredura pelo diff"): desktop claro e celular claro do estado inicial de toda tela tocada; tema escuro só quando o diff mexe em cor, token ou classe de tema; cenário no celular só com layout responsivo ou quando o critério pede. O pedido de capturas lista as variantes e o porquê. Na dúvida, a variante entra.
- **Uma leitura, dois laudos** (`reference/validacao-ux.md`, seção "Leitura única"): a UX lê cada captura uma vez, com o `medidas.json`, e dá o laudo de tela (`APROVADO` ou `REPROVADO — passo <k>`) e o de UX (`PRONTO` ou `AJUSTAR`). Ela grava `screen` e `ux` em duas chamadas separadas. O validador de tela fica com os passos pontuais de portal, sem selo no navegador, e com o roteiro de app, que não muda.
- **Conferência do `PRONTO` por amostra:** o maestro abre as capturas citadas num `[BLOQUEIA]` ou num `FALHA`, as de estado transitório e, por tela, uma de cenário e uma de varredura, e registra `capturas conferidas pelo maestro: <q> de <total> (amostra e bloqueios)`.
- **Validação PR a PR** (`SKILL.md`, seção "Validação PR a PR"): o executor captura o PR k+1 enquanto a UX lê o PR k. A UX lê um PR por vez. Com a ferramenta, a linha fixa ganha `— pedido <id>`, e o `maestro-sentinel.sh` aceita os ids dos pedidos abertos como argumentos e reporta o `CAPTURAS PRONTAS` deles mesmo quando a linha já estava na tela ao ser armado; linha antiga da mesma pasta não casa. Spec nova: `tests/maestro-sentinel.test.mjs`.
- **Ticket com os cenários:** com `team.capture`, o `pipeline-write-ticket` escreve o `— verify:` de cada critério de tela como cenário (`route`, `viewport`, `theme`, `actions`, `measures`, `shows`).
- **Profile e doctor:** o Passo 2 do `pipeline-project-profile` recusa `team.capture` sem `command`, comando sem `{scenarios}`, `{sha}`, `{out}` ou `{root}`, e a chave sem `team.roles.ux`. O item 23 do `/pipeline-doctor` confere que o comando resolve (programa, arquivo e script do `package.json`).
- `core/seals.md` e `core/seals-reference.md` dizem quem grava o `screen` na leitura única. O tipo dos selos e o `pipeline-gate.mjs` não mudam.

**Ao atualizar:** sem `team.capture`, nada muda: o executor escreve o script no scratchpad, a varredura tem as quatro variantes, o validador de tela e a UX leem as capturas e o maestro confere todas. O sentinela sem pastas extras se comporta como antes. Para ligar:
1. escreva a ferramenta de captura no repositório, no contrato de `.claude/pipeline/core/capture.md` (login, build por SHA, proxy da API, saída e medidas);
2. declare `team.capture.command` no profile;
3. ajuste o `verification.md` (seção "PR de tela": o tamanho do desktop e a varredura pelo diff);
4. rode o `/pipeline-doctor` até ficar verde.

## 0.6.1 — 2026-10-28

**Correção: o doctor ficava RED em projeto sem a extensão de um módulo opcional.**

- O item 25 (a) do `/pipeline-doctor` reprovava os ponteiros das skills `pipeline-triage` e `pipeline-triage-errors` para `.claude/pipeline/observability.md` quando o módulo de triagem estava desligado e o arquivo não existia. O item 30 dizia `OK` ao mesmo tempo, e o doctor se contradizia.
- A regra agora pula o ponteiro para extensão do projeto (`.claude/pipeline/<x>.md`, fora de `core/`) cujo arquivo não existe. A presença da extensão é cobrada pelo item do módulo (17, 18, 27 e 30). Existindo o arquivo, a seção continua conferida. A regra está em `core/format.md`, seção "Ponteiro".
- A correção vale para a classe inteira: `rules.md`, `ticket.md` e `security.md`, opcionais pelo item 17 ou desligados por `security.diffGate: false`, tinham o mesmo risco.
- Spec nova em `tests/docs.test.mjs`: projeto instalado sem extensão nenhuma passa sem falha de ponteiro, e uma extensão presente continua conferida.

**Ao atualizar:** só mudam `core/format.md` e `skills/pipeline-doctor/SKILL.md` (e o lock). O profile e as extensões não mudam.

## 0.6.0 — 2026-10-28

**Módulo de triagem de erros de produção (opt-in).** O erro chega ao provedor de observabilidade, a triagem lê pelo MCP dele, classifica, agrupa e, com o OK do humano, abre os tickets pelo `/pipeline-ticket`. Os fatos do projeto ficam no bloco `observability:` do profile e na extensão `observability.md`.

- **Contrato no profile:** seção `observability` no schema, com a chave obrigatória dentro do bloco `observability.provider` (só `sentry`). Ausente, o módulo fica desligado. O Passo 2 do `pipeline-project-profile` recusa bloco que não é mapa, `provider` ausente e outro provedor ("provedor sem suporte no core: hoje só `sentry`"); motivo em `reference/motivos.md`, seção "Observabilidade".
- **Extensão `observability.md`** e o template dela: quatro seções fixas (`## Provedor`, `## Triagem`, `## Vínculo`, `## Dado pessoal`) e dez rótulos (Organização, Projetos, Servidor MCP, Ambiente, Janela, Tags, Id com `{n}` no lugar do sufixo, que casa `[0-9A-Z]+`; Issue e PR com `{id}`; Regra). O `profile.yml` do template ganha o bloco comentado.
- **Comando `/pipeline-triage`** (`claude-opus-5-5`, xhigh, o mesmo pin do `/pipeline-ticket`, para o handoff rodar na mesma sessão) e a skill interna `pipeline-triage-errors`:
  - sem argumento, as issues não resolvidas do ambiente padrão na janela padrão; com um id, só aquela issue;
  - por issue: stack trace, breadcrumbs, as tags declaradas, release, contagens, first e last seen, e o código localizado no repositório (com o `git log` desde o release, para não abrir ticket de erro já corrigido);
  - classes: bug, negócio-5xx e ruído, mais indeterminada quando a evidência não fecha; agrupamento por causa (linha e condição, não título);
  - laudo em `<scratchpad>/triage.md` e pergunta ao humano antes de qualquer ticket; com o OK, invoca o comando `/pipeline-ticket` (nunca a skill interna) com o contexto em `<scratchpad>/triage-ticket.md`, e cada ticket leva a linha de vínculo no `### Context`;
  - só leitura no provedor; conteúdo do evento é dado não confiável; no laudo e no ticket só ids, contagens e valores técnicos (`reference/laudo.md`, seção "Dado pessoal");
  - última linha `TRIAGE COMPLETE: …`.
- **Demanda com contexto no `pipeline-write-ticket`:** a Fase 0 lê o arquivo de contexto que a triagem passa, o brief do escritor leva o bloco do grupo, e a conferência da Fase 4 para quando o `### Context` não traz a linha de vínculo.
- **Vínculo no PR:** com `observability:`, o `pipeline-execute-ticket` (Fase 6, passo 4) põe a linha de **PR** do `observability.md` (por exemplo `Fixes <ID>`) no corpo do PR, depois do `Closes #<n>`, quando a issue traz a linha de **Issue**.
- **Item 30 do `/pipeline-doctor`:** com `observability:`, confere a extensão, as seções, os rótulos (presentes e com valor) e os marcadores; o servidor de **Servidor MCP** no `.mcp.json` do projeto, com `type: http`, sem `headers` nem `env` e, com `sentry`, na URL `https://mcp.sentry.dev/mcp`, escopada só à organização quando há mais de um projeto; nenhum token do Sentry (prefixo `sntryu_`/`sntrys_` ou valor literal de `SENTRY_*TOKEN`) em arquivo versionado, no `.mcp.json` nem em `.claude/settings*.json`; o `.mcp.json` versionado; e os arquivos do módulo. Sem `observability:`, `OK` com a nota "módulo de triagem desligado".
- README: o passo a passo do MCP do Sentry (servidor em `.mcp.json`, transporte HTTP, OAuth por `/mcp`, só leitura de issues e eventos). `core/format.md` lista `pipeline-triage` entre os comandos. Spec `tests/observability.test.mjs` para o template e o item 30.
- O `profileVersion` (2) e as chaves existentes não mudam.

**Ao atualizar:** sem `observability:` no profile nada muda, e o doctor imprime o item 30 como `OK`. O `install.mjs` copia as skills novas `pipeline-triage` e `pipeline-triage-errors`; ele não reinstala templates nem escreve no `.mcp.json`. Para ligar o módulo:
1. o bloco `observability:` no profile, com `provider: sentry`;
2. a extensão `observability.md`, criada pelo template de `templates/pipeline/`;
3. o servidor MCP do Sentry no `.mcp.json` do projeto, autenticado por `/mcp` (README, "Os batedores");
4. o `/pipeline-doctor` verde, e então o `/pipeline-triage`.

## 0.5.0 — 2026-10-24

**Teto de contexto e arquivo de instruções como índice.** As chaves novas são opcionais; o env entra sempre que o projeto não tem valor.

- **Teto de contexto:**
  - o `install.mjs` grava `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW: "250000"` em `.claude/settings.json` quando o projeto não tem valor, sem trocar o que já está lá e sem duplicar; `env` fora de objeto é recusado. Saída nova `ENV`;
  - com `team:` no profile, o install mescla o gancho `SessionStart` (matcher `compact`) que roda o subcomando novo `pipeline-gate.mjs resume`: ele lê `team.note` e imprime "If you are the team orchestrator, read the note "<team.note>" before acting.". Sem `team:`, o gancho não entra, e o que tiver entrado sai (saída nova `UNHOOK`). O install detecta `team:` sem parser de YAML, e o `resume` sem `team` não imprime nada;
  - seção nova no schema, "O que o install põe no `settings.json`", com os ganchos e o env;
  - o `pipeline-maestro` deixa de assumir o env por conta própria e aponta para essa seção;
  - doctor, item 28 (**Contexto**): env ou `settings.json` ausente é `AVISO`; `settings.json` inválido é `FALHA`; com `team:`, gancho ausente é `FALHA`.
- **Arquivo de instruções como índice:**
  - chave opcional `knowledge.instructionsBudget` (bytes), sem default; o Passo 2 do `pipeline-project-profile` recusa valor que não seja inteiro positivo (motivo em `reference/motivos.md`, seção "Teto do arquivo de instruções");
  - guard novo `core/document-budget.mjs`: `Document budget check passed.`, ou `<arquivo>: <n> bytes, limit <m>` no stderr e exit 1; sem a chave ou sem `profile.yml`, aviso e exit 0, mesmo sem o pacote `yaml` (a chave é procurada no texto antes de carregá-lo, em estilo de bloco ou de fluxo; linha comentada não conta);
  - regra nova em `core/format.md`, seção "Arquivo de instruções do projeto": regra em uma linha e ponteiro, histórico e detalhe fora;
  - doctor, item 29: com a chave, roda o guard e procura o guard no `gate.final`; sem ela, `OK` com nota.

**Ao atualizar:** as chaves novas são opcionais, e o profile não precisa mudar. O `install.mjs` acrescenta `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (250000) ao `.claude/settings.json`, sem sobrescrever o valor que o projeto já tenha. Com `team:` no profile, ele também mescla o gancho `SessionStart`/`compact` de retomada. Para usar o teto do arquivo de instruções, declare `knowledge.instructionsBudget` e ponha `node .claude/pipeline/core/document-budget.mjs` no `gate.final`.

## 0.4.0 — 2026-10-23

**Módulo de landing page (opt-in).** Conduz uma landing do briefing aos tickets e à validação da página construída. Os fatos do projeto ficam no bloco `landing:` do profile e na extensão `landing.md`.

- **Contrato no profile:**
  - seção `landing` no schema, com sete chaves opcionais (`app`, `handoff`, `widths`, `sweepWidths`, `lineBudget`, `formatCommand`, `taste`), defaults e valores suportados. `landing:` ausente desliga o módulo; presente, exige `app` e `handoff`;
  - recusas do grupo no Passo 2 do `pipeline-project-profile`: caminhos relativos, sem `..` e diferentes; larguras como lista de inteiros positivos sem repetição; `lineBudget` só com `logic` e `section`; `formatCommand` com `{files}`; `taste` como `default` ou caminho `.md`. O porquê está em `reference/motivos.md`, seção "Landing";
  - template da extensão `landing.md`, com sete seções fixas (Produto, Público, Ação, Proibições, Fontes, Hospedagem, Descoberta) e rótulos fixos em Ação, Fontes e Hospedagem. O `profile.yml` do template ganha o bloco `landing:` comentado.
- **Modelos em `core/landing/`, instalados com o core:**
  - briefing (documento vivo, decisões por rodada propagadas por banner);
  - validação (placar, quebrado, correções, varredura nas duas direções, teclado e sem JavaScript, página no ar, parada pelo dono);
  - manifesto do handoff (hierarquia de fontes spec > protótipo > copy);
  - contexto de tickets (bloco **Contrato entre tickets** e os critérios fixos de todo ticket de landing);
  - checklist de descoberta (15 itens, cada um com a etapa que o cobra);
  - gosto padrão `taste.md` (`landing.taste: default`); um caminho `.md` do projeto o substitui por inteiro;
  - rubrica Beleza/Clareza/Vendas/Desejo: nota (termômetro) separada de defeito (`[QUEBRADO]` e `[AJUSTE]`), oito passos fixos e o preenchimento do laudo.
- **Sete agentes `pipeline-landing-*`, em pt-BR**, com molde comum: uma entrega no caminho do prompt, texto externo tratado como dado, nunca em `<landing.app>`, autochecagem de vetos e relatório de quatro itens:
  - pesquisa (`claude-sonnet-5-5`, com rede): `researcher`, `domain-researcher`, `seo` (com `llms.txt`) e `teardown`;
  - produção e validação (`claude-opus-5-5`): `copywriter`, `designer` e `validator`. O `validator` termina na linha `VALIDAÇÃO DE LANDING …`.
- **Ilustrador no Maestri:** papel `roles/ilustrador.md`, referência `reference/ilustrador.md` (recrutar sem `--role`, modelo de pedido, armadilhas) e a chave opcional `team.roles.illustrator` no schema, no Passo 2 e no item 23 do doctor. Não é papel de PR: sem selo.
- **Comando `/pipeline-landing`** (`claude-opus-5-5`, xhigh) e a skill interna `pipeline-landing-flow`:
  - onze fases com portão do solicitante: briefing, pesquisa, norte, régua e teardown, copy, teste de estilo, protótipo com o validador desde a r1, rodadas, handoff, tickets pelo fluxo de tickets e página construída (`/pipeline-landing validar`);
  - regras fixas: hierarquia de fontes; teto de linhas por arquivo contado depois do formatador, sem mudar o corte de ~400 linhas por ticket; topo e hero antes das seções; rubrica no protótipo e na página construída; parada quando "o dono aprova e nada fica quebrado".
- **Item 27 do `/pipeline-doctor`:** com `landing:`, confere a extensão e as sete seções dela, os placeholders, os rótulos da descoberta, `app`, `handoff` e `taste`, os modelos, a skill, os agentes e o ilustrador. Sem `landing:`, `OK` com a nota "módulo de landing desligado".
- **Ferramentas opcionais em `tools/landing/`**, fora do core e do `install.mjs`:
  - Python (`uv run`): `ink.py`, `fill.py` e `embed.py`, para tratar a arte e montar o protótipo em arquivo único;
  - Node com Playwright: `render.mjs` e `sweep.mjs`, para os quadros do hero, a rolagem para baixo e para cima, o sem JavaScript e a varredura de sobreposição e de rolagem horizontal.
- Spec `tests/landing-core.test.mjs` para os nomes, as seções e os rótulos de `core/landing/`. `core/format.md` lista `pipeline-landing` entre os comandos.
- O `profileVersion` (2) e as chaves existentes não mudam.

**Ao atualizar:** sem `landing:` no profile nada muda, e o doctor imprime o item 27 como `OK`. O `install.mjs` copia os arquivos novos: `core/landing/`, os agentes `pipeline-landing-*`, as skills `pipeline-landing` e `pipeline-landing-flow` e os dois `ilustrador.md` do `pipeline-maestro`. Ele não reinstala templates nem copia `tools/landing/`. Para ligar o módulo:
1. o bloco `landing:` no profile;
2. a extensão `landing.md`, criada pelo template de `templates/pipeline/`;
3. o fluxo `/pipeline-landing`.

As ferramentas de `tools/landing/` rodam do clone do toolkit.

## 0.3.0 — 2026-10-23

- **Eixo `supply-chain` no `pipeline-security-audit`:** genérico e opt-in. Roda os comandos de leitura que o projeto declara (auditoria de dependência, guarda de runtime, registro, varredura de imagem) e cinco verificações: `dependency-advisory`, `runtime-version`, `image-pin`, `override` e `unmaintained`. Os itens vão num bloco `## Supply chain`, depois de `## Findings`, nos laudos dos modos axis e sweep, com `BLOCKER` e `IMPORTANT` próprios e supressão pelo baseline; a linha `SECURITY SWEEP COMPLETE` soma os itens nas contagens, no mesmo formato.
- **Opt-in de verdade:** sem a seção `## Supply chain`, com rótulo faltando ou com valor ainda `<…>`, o revisor do eixo não roda comando, não escreve laudo e termina em `SECURITY AXIS STOPPED supply-chain: <o que falta>`; o sweep repassa o motivo e não conta o eixo.
- **Regra 1.7:** no eixo `supply-chain`, aviso de dependência vem só da saída da ferramenta declarada; fora dele (os outros eixos e o modo diff) segue fora de escopo, e nunca se inventa CVE. A regra de prova vale como antes para todo achado de `## Findings`; o item de supply-chain é a única exceção, e é do core.
- **Template do `security.md`:** o eixo em `## Eixos` e a seção `## Supply chain` com seis rótulos (Auditoria, Runtime, Imagens e pins, Overrides, Registro, Guarda).
- O modo diff, os `## Triggers`, o `profile.yml` e o `profileVersion` (2) não mudam.

**Ao atualizar:** para ligar o eixo, liste `supply-chain` em `## Eixos` do `security.md` e acrescente a seção `## Supply chain` com os fatos do projeto, no formato de `templates/pipeline/security.md`; sem isso nada muda, porque o eixo é opt-in. O `install.mjs` não reinstala templates: o template novo serve só de referência para quem já instalou.

## 0.2.1 — 2026-10-16

Só processo do repositório; nada muda no que o projeto recebe.

- **Releases do GitHub:** cada versão é uma release com a seção do changelog como notas (`scripts/release-notes.mjs`); as versões 0.1.0 a 0.2.0 ganharam a release delas.
- **Workflows:** `validate.yml` (`npm test` e `npm run guard` em PR e na `main`) e `release.yml` (reprova, depois da publicação, pre-release, tag fora de `vX.Y.Z`, commit fora da `main`, `VERSION` diferente da tag e versão sem seção no changelog); `tests/version.test.mjs` confere `package.json`, badge e changelog contra o `VERSION`.
- **Versão obrigatória:** no PR, `scripts/version-guard.mjs` reprova mudança em `core/`, `skills/`, `agents/` ou `templates/` sem `VERSION` acima do da `main`; com o teste de versão, a mudança que chega aos projetos sempre tem entrada no changelog.

**Ao atualizar:** só o `toolkit.lock` muda (versão); os arquivos instalados são os mesmos da 0.2.0.

## 0.2.0 — 2026-10-16

- **`/pipeline-doctor`, item 26 (Toolkit):** sem `toolkit.lock`, `AVISO`; com lock, o `verify.mjs` precisa sair 0 (senão `FALHA` com os arquivos), e o `<gate.final>` precisa rodar o `verify.mjs` (senão `AVISO`).

**Ao atualizar:** ponha o `verify.mjs` no gate, se ainda não estiver (`prompts/01-instalar.md`, passo 8). Com formatador ou linter no projeto, exclua `.claude/pipeline/core/` e o `toolkit.lock` dele: reformatar um arquivo do toolkit quebra o hash.

## 0.1.1 — 2026-10-16

Só repositório e README; nada muda no que o projeto recebe.

- `.gitignore` cobre editores, estado local de agentes, `.env*` e saídas de teste.
- README: lacres simétricos em `selos.svg` e espadas com lâmina, guarda e pomo em `hero.svg`.

**Ao atualizar:** só o `toolkit.lock` muda (versão); os arquivos instalados são os mesmos da 0.1.0.

## 0.1.0 — 2026-10-16

Primeira versão: o core do pipeline sai de dentro de um projeto e vira fonte única.

- **Core** (`core/`): `entrada.md`, `format.md`, `principles.md`, `profile-schema.md` (profile `profileVersion: 2`), `seals.md`, `seals-reference.md`, `ux-reference.md` e `pipeline-gate.mjs`, idênticos à origem.
- **Skills** `pipeline-*` (11) e **agents** `pipeline-*` (4), idênticos à origem.
- **Novo:** `scripts/install.mjs` (cópia determinística de conteúdo e bit de execução, `toolkit.lock` com sha256, limpeza do espaço do toolkit, mescla idempotente dos ganchos do gate, recusa de link simbólico, `--check`).
- **Novo:** `core/verify.mjs`, a guarda de deriva que o projeto põe no gate (arquivo editado, apagado, acrescentado ou sem o bit de execução).
- **Novo:** `scripts/neutrality-guard.mjs`; `scripts/token-usage.mjs` com `--project` (antes filtrava por um nome de projeto fixo).
- **Novo:** `templates/` (profile, extensões e issue form em branco) e `prompts/01-instalar.md` e `02-atualizar.md`.

**Ao atualizar:** primeira instalação; siga `prompts/01-instalar.md`. Num projeto que já tinha o core copiado à mão, o `install --check` lista o que diverge.

**Verificação:**

- `npm test` 29/29 e `npm run guard` verdes.
- Ensaio num clone local do projeto de origem:
  - `install --check` listou só `ADD .claude/pipeline/core/verify.mjs` e o lock novo;
  - `install` resultou em 1 arquivo adicionado, 0 alterados, 0 removidos e 0 ganchos novos; o `settings.json` ficou intacto;
  - o `verify` conferiu 63 arquivos e saiu 0; com uma linha alterada, saiu 1 e citou o arquivo;
  - o teste do gate do projeto deu 11/11.
- Projeto vazio: a primeira instalação gravou 63 arquivos e os 3 ganchos; a segunda não mudou nada.
