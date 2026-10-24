# Legend AI Toolkit

Fonte única do pipeline de agentes (ticket, execução, revisão, selos e merge) que os projetos instalam. O que vive aqui é **genérico**: o fato de cada projeto mora no `profile.yml` e nas extensões dele, nunca aqui.

Este arquivo é índice: uma linha por regra. Abra o ponteiro só quando a tarefa tocar o assunto.

## Regras

- **Estrutura:** `core/`, `skills/pipeline-*` e `agents/pipeline-*.md` vão para o projeto; `templates/` é copiado uma vez; `prompts/`, `scripts/`, `tests/`, `tools/` e `docs/` não vão. Mapa: `docs/contribuindo.md`, seção "Estrutura".
- **Core neutro:** nenhum arquivo cita um projeto que usa o toolkit; `npm run guard` impõe. Detalhe: `docs/contribuindo.md`, seção "Core neutro".
- **Antes do commit:** `npm test` e `npm run guard` verdes.
- **Versão:** semver em `VERSION`, `package.json`, `CHANGELOG.md` e badge do `README.md`, juntos; mudança em `core/`, `skills/`, `agents/` ou `templates/` sobe a versão. Regra de major/minor/patch: `docs/contribuindo.md`, seção "Versão".
- **Fluxo de mudança:** branch e PR aqui, merge na `main`, release, `prompts/02-atualizar.md` em cada projeto; push direto na `main` só com autorização explícita. Detalhe: `docs/contribuindo.md`, seção "Fluxo de mudança".
- **Release:** release do GitHub `vX.Y.Z`, publicada pelo humano (ou pelo agente com o pedido dele), com as notas do changelog. Passos: `docs/contribuindo.md`, seção "Release".
- **`install.mjs`:** determinístico, sem dependência, nunca escreve em `profile.yml`, extensão ou skill fora de `pipeline-*`; spec em `tests/install.test.mjs`. Detalhe: `docs/contribuindo.md`, seção "`install.mjs`".
- **Idioma:** prosa em pt-BR; código, testes, `/** */` e erro técnico em inglês. Commit convencional com emoji do `git-cz`, em português. Detalhe: `docs/contribuindo.md`, seção "Idioma e commit".
- **Tema medieval** só no `README.md` e nas imagens.
- **Princípios de código e revisão:** `core/principles.md` e `core/format.md`.
