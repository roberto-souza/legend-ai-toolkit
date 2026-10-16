# Changelog

Semver: quebra do contrato do profile sobe o major; skill, regra ou chave opcional nova sobe o minor; correção sobe o patch. Cada versão diz o que o projeto precisa fazer ao atualizar.

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
