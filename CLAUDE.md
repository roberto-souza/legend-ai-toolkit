# Legend AI Toolkit

Fonte única do pipeline de agentes (ticket, execução, revisão, selos e merge) que os projetos instalam. O que vive aqui é **genérico**: o fato de cada projeto mora no `profile.yml` e nas extensões dele, nunca aqui.

## Estrutura

| Pasta | O que é | Vai para o projeto em |
| --- | --- | --- |
| `core/` | contrato do pipeline, gate de selos (`pipeline-gate.mjs`) e guarda de deriva (`verify.mjs`) | `.claude/pipeline/core/` |
| `skills/pipeline-*` | as skills do fluxo | `.claude/skills/` |
| `agents/pipeline-*.md` | os subagentes | `.claude/agents/` |
| `templates/` | profile, extensões e issue form em branco | copiados uma vez, pelo prompt 01 |
| `prompts/` | o que o agente do projeto lê para instalar (01) e atualizar (02) | não vai |
| `scripts/` | `install.mjs`, `neutrality-guard.mjs`, `release-notes.mjs`, `token-usage.mjs` | não vai |
| `.github/workflows/` | `validate.yml` (PR e `main`) e `release.yml` (release publicada) | não vai |
| `tests/` | `node --test`, sem dependência | não vai |

## Regras

- **Core neutro.** Nenhum arquivo cita um projeto que usa o toolkit; `npm run guard` impõe (lista em `scripts/neutrality.json`). Exemplo de valor vai entre `<>` ou como valor genérico.
- **Antes do commit:** `npm test` e `npm run guard` verdes.
- **Versão (semver em `VERSION`, `package.json`, `CHANGELOG.md` e no badge do `README.md`, juntos):** quebra do contrato do profile (`core/profile-schema.md`, "Mudança de formato") sobe o major; skill, regra ou chave opcional nova sobe o minor; correção sobe o patch. Cada versão vira uma **release do GitHub** (`vX.Y.Z`), nunca só uma tag solta.
- **Fluxo de mudança:** branch e PR aqui (`validate.yml` roda `npm test` e `npm run guard`), merge na `main`, release, e em cada projeto o `prompts/02-atualizar.md`. Push direto na `main` só com autorização explícita. Mudança feita direto num projeto falha no `verify.mjs` dele.
- **Release:** o PR que fecha a versão traz `VERSION`, `package.json`, badge e a seção `## X.Y.Z — data` do `CHANGELOG.md`, com "**Ao atualizar:**". Depois do merge, quem publica é o humano ou o agente com o pedido dele: `node scripts/release-notes.mjs X.Y.Z > notas.md` e `gh release create vX.Y.Z --target main --title vX.Y.Z --notes-file notas.md`. As notas são a seção do changelog, não `--generate-notes`. O `release.yml` roda depois da publicação e reprova pre-release, tag fora de `vX.Y.Z`, commit fora da `main`, `VERSION` diferente da tag e versão sem seção no changelog, e roda o `validate`; vermelho, apague a release e a tag e refaça. `tests/version.test.mjs` confere que `package.json`, badge e changelog seguem o `VERSION`.
- **`install.mjs` é determinístico:** copia (conteúdo e bit de execução), remove do espaço do toolkit (`.claude/pipeline/core/`, `.claude/skills/pipeline-*`, `.claude/agents/pipeline-*.md`) o que esta versão não traz, grava o lock e mescla ganchos; recusa link simbólico e `settings.json` em formato inesperado. Nunca toca em `profile.yml`, extensão ou skill fora de `pipeline-*`; mudança nessa fronteira tem spec em `tests/install.test.mjs`.
- **Idioma:** prosa em pt-BR (skills, docs, prompts, README, commits); código, testes, `/** */` e erro técnico em inglês.
- **Commit** convencional com emoji do `git-cz`, imperativo, em português: `feat: ✨ acrescenta …`.
- **Tema medieval só no `README.md` e nas imagens.** Skills, comandos e código usam os nomes do pipeline.
- Os princípios de código e revisão são os do próprio core: `core/principles.md` e `core/format.md`.
