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
| `scripts/` | `install.mjs`, `neutrality-guard.mjs`, `token-usage.mjs` | não vai |
| `tests/` | `node --test`, sem dependência | não vai |

## Regras

- **Core neutro.** Nenhum arquivo cita um projeto que usa o toolkit; `npm run guard` impõe (lista em `scripts/neutrality.json`). Exemplo de valor vai entre `<>` ou como valor genérico.
- **Antes do commit:** `npm test` e `npm run guard` verdes.
- **Versão (semver em `VERSION`, `package.json`, `CHANGELOG.md` e no badge do `README.md`, juntos):** quebra do contrato do profile (`core/profile-schema.md`, "Mudança de formato") sobe o major; skill, regra ou chave opcional nova sobe o minor; correção sobe o patch. Cada versão vira tag `vX.Y.Z`.
- **Fluxo de mudança:** PR aqui, tag, e em cada projeto o `prompts/02-atualizar.md`. Mudança feita direto num projeto falha no `verify.mjs` dele.
- **`install.mjs` é determinístico:** copia (conteúdo e bit de execução), remove do espaço do toolkit (`.claude/pipeline/core/`, `.claude/skills/pipeline-*`, `.claude/agents/pipeline-*.md`) o que esta versão não traz, grava o lock e mescla ganchos; recusa link simbólico e `settings.json` em formato inesperado. Nunca toca em `profile.yml`, extensão ou skill fora de `pipeline-*`; mudança nessa fronteira tem spec em `tests/install.test.mjs`.
- **Idioma:** prosa em pt-BR (skills, docs, prompts, README, commits); código, testes, `/** */` e erro técnico em inglês.
- **Commit** convencional com emoji do `git-cz`, imperativo, em português: `feat: ✨ acrescenta …`.
- **Tema medieval só no `README.md` e nas imagens.** Skills, comandos e código usam os nomes do pipeline.
- Os princípios de código e revisão são os do próprio core: `core/principles.md` e `core/format.md`.
