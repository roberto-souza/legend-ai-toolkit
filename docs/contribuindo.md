# Contribuindo com o toolkit

O detalhe das regras que o `CLAUDE.md` lista em uma linha. Leia só a seção que a tarefa pede.

## Estrutura

| Pasta | O que é | Vai para o projeto em |
| --- | --- | --- |
| `core/` | contrato do pipeline, gate de selos (`pipeline-gate.mjs`), guarda de deriva (`verify.mjs`), guard do teto do arquivo de instruções (`document-budget.mjs`) e os modelos do módulo de landing (`core/landing/`) | `.claude/pipeline/core/` |
| `skills/pipeline-*` | as skills do fluxo | `.claude/skills/` |
| `agents/pipeline-*.md` | os subagentes | `.claude/agents/` |
| `templates/` | profile, extensões e issue form em branco | copiados uma vez, pelo prompt 01 |
| `prompts/` | o que o agente do projeto lê para instalar (01) e atualizar (02) | não vai |
| `scripts/` | `install.mjs`, `neutrality-guard.mjs`, `release-notes.mjs`, `version-guard.mjs`, `token-usage.mjs` | não vai |
| `.github/workflows/` | `validate.yml` (PR e `main`) e `release.yml` (release publicada) | não vai |
| `tests/` | `node --test`, sem dependência | não vai |
| `tools/landing/` | ferramentas opcionais de landing (Python com `uv`, Node com Playwright) | não vai |
| `docs/` | este guia e as imagens do README | não vai |

## Core neutro

- Nenhum arquivo cita um projeto que usa o toolkit. O `npm run guard` impõe, com a lista de `scripts/neutrality.json`.
- Exemplo de valor vai entre `<>` ou como valor genérico.

## Versão

- Semver em `VERSION`, `package.json`, `CHANGELOG.md` e no badge do `README.md`, os quatro juntos.
- Quebra do contrato do profile (`core/profile-schema.md`, seção "Mudança de formato") sobe o major.
- Skill, regra ou chave opcional nova sobe o minor.
- Correção sobe o patch.
- Cada versão vira uma **release do GitHub** (`vX.Y.Z`), nunca só uma tag solta.
- `tests/version.test.mjs` confere que `package.json`, badge e changelog seguem o `VERSION`.
- No PR, o `scripts/version-guard.mjs` reprova mudança em `core/`, `skills/`, `agents/` ou `templates/` sem `VERSION` acima do da `main`.

## Fluxo de mudança

- Branch e PR aqui. O `validate.yml` roda `npm test` e `npm run guard`.
- O `npm test` também confere que todo ponteiro dos arquivos instalados e destes docs resolve, e que o comando do item 28 do doctor funciona (`tests/docs.test.mjs`).
- Merge na `main`, release, e em cada projeto o `prompts/02-atualizar.md`.
- Push direto na `main` só com autorização explícita.
- Mudança feita direto num projeto falha no `verify.mjs` dele.

## Release

1. O PR que fecha a versão traz `VERSION`, `package.json`, badge e a seção `## X.Y.Z — data` do `CHANGELOG.md`, com "**Ao atualizar:**".
2. Depois do merge, quem publica é o humano, ou o agente com o pedido dele:

   ```bash
   node scripts/release-notes.mjs X.Y.Z > notas.md
   gh release create vX.Y.Z --target main --title vX.Y.Z --notes-file notas.md
   ```

3. As notas são a seção do changelog, nunca `--generate-notes`.
4. O `release.yml` roda depois da publicação. Ele reprova pre-release, tag fora de `vX.Y.Z`, commit fora da `main`, `VERSION` diferente da tag e versão sem seção no changelog, e roda o `validate`.
5. Vermelho → apague a release e a tag e refaça.

## `install.mjs`

- É determinístico: copia conteúdo e bit de execução, e remove do espaço do toolkit (`.claude/pipeline/core/`, `.claude/skills/pipeline-*`, `.claude/agents/pipeline-*.md`) o que esta versão não traz.
- Grava o lock e mescla no `.claude/settings.json` os ganchos do gate, o `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW` e, só com `team:` no profile, o gancho `SessionStart`/`compact` de retomada. O que entra ali: `core/profile-schema.md`, seção "O que o install põe no `settings.json`".
- Recusa link simbólico e `settings.json` em formato inesperado.
- Lê o `profile.yml`, mas nunca escreve nele, em extensão nem em skill fora de `pipeline-*`.
- Mudança nessa fronteira tem spec em `tests/install.test.mjs`.

## Idioma e commit

- Prosa em pt-BR: skills, docs, prompts, README e commits.
- Código, testes, `/** */` e erro técnico em inglês.
- Commit convencional com emoji do `git-cz`, imperativo, em português: `feat: ✨ acrescenta …`.
- Tema medieval só no `README.md` e nas imagens. Skills, comandos e código usam os nomes do pipeline.
