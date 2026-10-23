# Changelog

Semver: quebra do contrato do profile sobe o major; skill, regra ou chave opcional nova sobe o minor; correção sobe o patch. Cada versão diz o que o projeto precisa fazer ao atualizar.

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
