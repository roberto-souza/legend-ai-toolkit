# Changelog

Semver: quebra do contrato do profile sobe o major; skill, regra ou chave opcional nova sobe o minor; correção sobe o patch. Cada versão diz o que o projeto precisa fazer ao atualizar.

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
