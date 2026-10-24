# Changelog

Semver: quebra do contrato do profile sobe o major; skill, regra ou chave opcional nova sobe o minor; correção sobe o patch. Cada versão diz o que o projeto precisa fazer ao atualizar.

## 0.5.0 — 2026-10-24

**Teto de contexto e arquivo de instruções como índice (os dois opcionais).**

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

**Ao atualizar:** tudo é opcional. Sem mudar o profile, o `install.mjs` só acrescenta `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (250000) ao `.claude/settings.json`, sem sobrescrever o valor que o projeto já tenha. Com `team:` no profile, ele também mescla o gancho `SessionStart`/`compact` de retomada. Para usar o teto do arquivo de instruções, declare `knowledge.instructionsBudget` e ponha `node .claude/pipeline/core/document-budget.mjs` no `gate.final`.

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
