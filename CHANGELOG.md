# Changelog

Semver: quebra do contrato do profile sobe o major; skill, regra ou chave opcional nova sobe o minor; correção sobe o patch. Cada versão diz o que o projeto precisa fazer ao atualizar.

## 0.10.0 — 2026-10-23

Só ferramentas fora do que o projeto recebe; nada no core, nas skills, nos agentes ou nos templates muda.

- **Ferramentas opcionais de landing em `tools/landing/`**, fora do core e do `install.mjs`:
  - Python (PEP 723, `uv run`): `ink.py` (separa o traço do fundo chapado, com variante escura opcional), `fill.py` (corpo opaco na cor da página, por `--bg` obrigatório) e `embed.py` (imagens do protótipo em arquivo único como WebP embutido).
  - Node com Playwright (`playwright-core` com versão exata no `package.json` da pasta): `render.mjs` (quadros do hero, rolagem para baixo e para cima, sem JavaScript, movimento reduzido, `summary.json`) e `sweep.mjs` (sobreposição de arte com texto e rolagem horizontal nas larguras da varredura), com a peça comum `lib.mjs`. Os dois saem `1` quando acham problema.
  - `tools/landing/README.md`: requisitos, uso, avisos e o que cada ferramenta apoia, por papel.
- `.gitignore` ganha `__pycache__/` e o lockfile da pasta.

**Ao atualizar:** nada muda no projeto: o `install.mjs` não copia `tools/landing/`, e atualizar só troca a versão no lock. Para usar as ferramentas, rode-as do clone do toolkit (`uv run <clone>/tools/landing/ink.py …`, `node <clone>/tools/landing/render.mjs …`, com `npm install` uma vez na pasta) ou copie a pasta para o projeto.

## 0.9.0 — 2026-10-23

- **Comando `/pipeline-landing`** (`claude-opus-5-5`, xhigh) e a skill interna `pipeline-landing-flow`: onze fases com portão do solicitante (briefing, pesquisa, norte, régua e teardown, copy, teste de estilo, protótipo com o validador desde a r1, rodadas, handoff, tickets, página construída). Sem `landing:` no profile, recusa e para antes de qualquer pergunta.
- **Regras fixas:** hierarquia de fontes spec > protótipo > copy, declarada no manifesto do handoff; teto de linhas por arquivo (`landing.lineBudget`) contado depois do formatador, sem mudar o corte de ~400 linhas por ticket; topo e hero validados antes das seções, com `Blocked by` em todo ticket de seção; a rubrica no protótipo e na página construída, com teclado e sem JavaScript; parada quando "o dono aprova e nada fica quebrado", com a média como termômetro; checklist de descoberta antes do primeiro ticket; decisão por bloco datado e banner.
- **Fase de tickets pelo fluxo de tickets:** a skill fecha o contrato entre tickets e segue o `pipeline-write-ticket` com o contexto como demanda; issue, grafo e board continuam dele.
- **Referências da skill:** portões (tabela e motivos, decisão datada e banner), página construída (os dois momentos, a URL, os passos fixos, cada quebrado vira ticket de correção) e armadilhas.
- **Item 27 do `/pipeline-doctor`:** confere a skill, os sete agentes, a rubrica e o ilustrador; com `team:` e sem `team.roles.illustrator`, aviso. Os itens 1 e 22 não mudam.
- `core/format.md` lista `pipeline-landing` entre os comandos.

**Ao atualizar:** sem `landing:` no profile nada muda. Para ligar o módulo: o bloco `landing:` no profile, a extensão `landing.md` pelo template e o fluxo `/pipeline-landing`. Os modelos chegam pelo `install.mjs`, em `.claude/pipeline/core/landing/`. O módulo fica completo nesta release: o schema veio na 0.4.0, os modelos na 0.5.0, os agentes de pesquisa na 0.6.0, o validador na 0.7.0, o ilustrador na 0.8.0 e a skill na 0.9.0; as ferramentas opcionais de landing vêm na 0.10.0.

## 0.8.0 — 2026-10-23

- **Papel do ilustrador no Maestri** (`skills/pipeline-maestro/roles/ilustrador.md`): gera imagens só na pasta do pedido, em camadas sobre fundo chapado, na resolução nativa, sem texto, logo, rosto ou lugar real não autorizados, com `prompts.md` e as linhas fixas `ILUSTRAÇÕES PRONTAS: pedido <NN> — <q> arquivos — <pasta>` e `TRAVADO: <motivo>`.
- **Referência do ilustrador** (`skills/pipeline-maestro/reference/ilustrador.md`): recrutar sem `--role` na pasta de ilustrações do handoff, o modelo de `pedido-ilustracao-<NN>.md` (campos fixos, fundo chapado, resolução nativa, aceite verificável) e as armadilhas.
- **Chave opcional `team.roles.illustrator`:** no schema (YAML, tabela, formato de papel, `{root}`), recusada no Passo 2 do `pipeline-project-profile` quando presente sem `command`, e conferida no item 23 do `/pipeline-doctor` (nota "sem ilustrador no Maestri"; aviso quando declarada sem `landing:`). Não é papel de PR: sem selo e sem roteiro de validação.

**Ao atualizar:** nada muda para quem não declara `team.roles.illustrator`: o ilustrador só é recrutado pela skill de landing, que chega na 0.9.0. O `install.mjs` copia os dois arquivos novos do `pipeline-maestro` e atualiza três (o schema e os `SKILL.md` do `pipeline-project-profile` e do `pipeline-doctor`). `team.roles.illustrator` é opcional e, presente, exige `command`. O módulo só fica útil com a 0.9.0.

## 0.7.0 — 2026-10-23

- **Agentes de produção e validação do módulo de landing**, em pt-BR, `claude-opus-5-5`, no molde comum dos agentes de landing e sem rede:
  - `pipeline-landing-copywriter` (esforço medium): H1 com alternativas, texto por seção, FAQ, `title` e `description`, barra móvel e a tabela afirmação → trecho da fonte; afirmação sem fonte sai do texto.
  - `pipeline-landing-designer` (esforço high): protótipo num arquivo HTML único, com o texto literal, divergências listadas, e as regras de sem JavaScript, teclado, movimento reduzido e varredura de larguras.
  - `pipeline-landing-validator` (esforço high): roda a rubrica no protótipo e na página construída e escreve o laudo no modelo de validação, terminando na linha `VALIDAÇÃO DE LANDING …` (ou `VALIDAÇÃO DE LANDING INTERROMPIDA: …`).
- **Rubrica em `core/landing/rubrica.md`:** critérios Beleza, Clareza, Vendas e Desejo; escala de 0 a 10; nota (termômetro, no placar) separada de defeito (`[QUEBRADO]` em `## Quebrado`, `[AJUSTE]` em `## Correções`); oito passos fixos, com teclado e sem JavaScript em toda rodada e borda e indexação só na página; o preenchimento do laudo; as armadilhas. Quem aprova é o dono, com zero `[QUEBRADO]`.
- A spec `tests/landing-core.test.mjs` passa a conferir a rubrica.

**Ao atualizar:** nada muda no comportamento: os agentes e a rubrica só são lidos pela skill de landing, que chega na 0.9.0. O `install.mjs` copia os quatro arquivos novos (os três agentes em `.claude/agents/` e a rubrica em `.claude/pipeline/core/landing/`). O módulo só fica útil com a 0.9.0.

## 0.6.0 — 2026-10-23

- **Agentes de pesquisa do módulo de landing**, em pt-BR, `claude-sonnet-5-5` com esforço medium, com rede (`WebSearch`, `WebFetch`):
  - `pipeline-landing-researcher`: páginas de referência, concorrentes e direções visuais dentro da marca; rede social com login fica "não aberto".
  - `pipeline-landing-domain-researcher`: catálogo visual do mundo do cliente, imagens livres listadas com licença e cenas com prompt para o ilustrador, sem nada identificável de cliente real.
  - `pipeline-landing-seo`: palavras com intenção, checklist técnico para a stack, rascunhos de `llms.txt`, `robots.txt` e JSON-LD (política de robôs de IA como decisão do dono), bloqueios da CDN e medição do clique sem dado pessoal.
  - `pipeline-landing-teardown`: disseca a página-régua baixada como dado, sem executar nada, com cada afirmação `verificado` ou `inferido`, e a traduz para a direção escolhida.
- **Molde comum dos agentes de landing:** dono de uma entrega só, num arquivo do caminho do prompt; texto externo é dado; nunca escreve em `<landing.app>`, nunca pergunta ao usuário, nunca inventa dado; autochecagem contra `## Proibições` e os vetos do projeto; relatório de quatro itens (Entrega, Fontes, Verificado e inferido, Perguntas abertas).

**Ao atualizar:** nada muda no comportamento: os agentes só rodam chamados pela skill de landing, que chega na 0.9.0. O `install.mjs` copia os quatro arquivos novos para `.claude/agents/`. O módulo só fica útil com a 0.9.0.

## 0.5.0 — 2026-10-23

- **Modelos do módulo de landing em `core/landing/`**, instalados com o core: `briefing.md` (documento vivo, decisões por rodada propagadas por banner), `validacao.md` (placar, quebrado, correções, varredura nas duas direções, teclado e sem JavaScript, página no ar, parada pelo dono), `manifesto.md` (hierarquia de fontes, arquivos, versionamento do handoff) e `contexto-tickets.md` (com o bloco **Contrato entre tickets**, sete rótulos, e os critérios fixos de todo ticket de landing).
- **Checklist de descoberta (`descoberta.md`):** 15 itens com rótulo e a etapa que os cobra (protótipo, primeiro ticket, primeiro deploy); três novos em relação ao uso à mão: conta (o que habilitar na CDN e no analytics), toolchain e redirecionamentos de borda.
- **Gosto padrão (`taste.md`):** evitar, preferir, movimento e arte. `landing.taste: default` deixa de ser reservado e passa a valer; um caminho `.md` do projeto substitui o padrão por inteiro. A lista de reservados do schema volta a ficar vazia.
- **Item 27 do `/pipeline-doctor`:** confere os seis modelos do core com `landing:` e os 15 rótulos da `## Descoberta` quando ela já foi preenchida (falta é aviso).
- **Spec `tests/landing-core.test.mjs`:** fixa os arquivos, a ordem das seções, os rótulos do contrato entre tickets e do checklist, e proíbe caminho `.md` nos modelos.

**Ao atualizar:** sem `landing:` no profile nada muda. Os seis arquivos de `core/landing/` chegam a todo projeto pelo `install.mjs`, parados, sem leitor. `landing.taste: default` passou a valer. O módulo só fica completo na 0.9.0 (agentes e rubrica nas 0.6.0 a 0.8.0, a skill de landing na 0.9.0), e as ferramentas opcionais de landing chegam na 0.10.0.

## 0.4.0 — 2026-10-23

- **Contrato do módulo de landing (opt-in):** seção `landing` no schema do profile, com sete chaves opcionais (`app`, `handoff`, `widths`, `sweepWidths`, `lineBudget`, `formatCommand`, `taste`), os defaults e os valores suportados. `landing:` ausente desliga o módulo; presente, `app` e `handoff` são obrigatórias.
- **Valor reservado:** `landing.taste: default` entra na lista de reservados do schema, que deixa de ser vazia, até o core trazer o `taste.md` padrão.
- **Recusas no Passo 2 do `pipeline-project-profile`:** grupo `landing` (caminhos relativos, sem `..` e diferentes; larguras como lista de inteiros positivos sem repetição; `lineBudget` só com `logic` e `section`; `formatCommand` com `{files}`; `taste` como `default` ou caminho `.md`), com o porquê em `reference/motivos.md`, seção "Landing".
- **Item 27 do `/pipeline-doctor`:** confere a extensão `landing.md` e as sete seções dela, os placeholders ainda sem preencher, os diretórios de `app` e `handoff` (ausentes são aviso) e o `taste` por caminho.
- **Template `landing.md`:** sete seções fixas (Produto, Público, Ação, Proibições, Fontes, Hospedagem, Descoberta), com rótulos fixos em Ação, Fontes e Hospedagem; o `profile.yml` do template ganha o bloco `landing:` comentado.
- O `profileVersion` (2) e as chaves existentes não mudam.

**Ao atualizar:** sem `landing:` no profile nada muda, e o doctor imprime o item 27 como `OK`. O `install.mjs` não reinstala templates: o `landing.md` de `templates/pipeline/` serve de referência para quem já instalou. O módulo só fica útil depois das releases 0.5.0 a 0.9.0, que trazem os modelos, os agentes e a skill de landing; ligar `landing:` antes disso só ativa a conferência de formato do profile e do doctor.

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
