# 01 — Instalar o Legend AI Toolkit num projeto

## Quando usar

O projeto ainda não tem `.claude/pipeline/toolkit.lock`. Pode já ter um core copiado à mão: a instalação o substitui pela versão do toolkit e o diff mostra a diferença.

## Prompt

Cole na sessão do agente, na raiz do projeto:

```text
Leia https://raw.githubusercontent.com/roberto-souza/legend-ai-toolkit/main/prompts/01-instalar.md e execute a seção "O que o agente faz" neste repositório.
```

Com um clone local do toolkit, troque a URL pelo caminho dele (`<clone>/prompts/01-instalar.md`). Nos passos abaixo, `<TOOLKIT>` é esse clone.

## O que o agente faz

1. **Confira o terreno.** Esteja na raiz de um repositório git, numa branch nova (`chore/<n>-legend-ai-toolkit` ou a convenção do projeto), com a árvore limpa. Sem clone local do toolkit, clone com `git clone --depth 1 https://github.com/roberto-souza/legend-ai-toolkit <pasta temporária>` e use essa pasta como `<TOOLKIT>`.
2. **Veja antes de escrever.** Rode `node <TOOLKIT>/scripts/install.mjs --to . --check` e mostre o que vai mudar (`ADD`, `CHANGE`, `MODE`, `REMOVE`, `HOOK`, `LOCK`). `CHANGE` num core copiado à mão é deriva: anote para o PR. `REMOVE` apaga tudo no espaço do toolkit que ele não traz; se ali houver uma skill `pipeline-*` própria do projeto, pare e pergunte ao humano (o prefixo é do toolkit, e a skill precisa de outro nome).
3. **Instale.** Rode `node <TOOLKIT>/scripts/install.mjs --to .`. O script copia o core, as skills e os agents `pipeline-*`, grava `.claude/pipeline/toolkit.lock` e mescla os ganchos do gate em `.claude/settings.json`. Não toca em `profile.yml`, nas extensões nem em outra skill.
4. **Profile.** Se `.claude/pipeline/profile.yml` não existe, copie `<TOOLKIT>/templates/pipeline/profile.yml` e preencha **com fatos lidos do projeto**: `repo` pelo `gh repo view`, `board.projectId` pelo `gh project view <n> --owner <owner> --format json --jq .id`, `statusField` e `statusOptions` pelo `gh project field-list`, `gate.loop` e `gate.final` pelos scripts reais do projeto, `knowledge` pelos arquivos que existem. Chave sem fato conhecido: pergunte ao humano, nunca invente.
5. **Board e issue.** Com board:
   - se `issues.template` não existe, copie `<TOOLKIT>/templates/github/ISSUE_TEMPLATE/ticket.yml` para ele e troque as opções de `App`, a label (`labels:`, igual a `issues.label`) e as checagens pelas do projeto (os cabeçalhos `###` ficam como estão: as skills os leem);
   - se a label `issues.label` não existe em `gh label list`, crie com `gh label create <label>`.
6. **Extensões.** `rules.md`, `ticket.md` e `verification.md` entram se o projeto quiser (`verification.md` é obrigatória com `team:`), e `landing.md` entra se o projeto liga o módulo de landing (`landing:` no profile); o template de cada uma está ao lado do profile. O projeto que vai ter landing liga `landing:` no profile, cria `landing.md` pelo template e roda o fluxo `/pipeline-landing`; os modelos e o gosto padrão de `landing.taste: default` já chegam pelo passo 3, em `.claude/pipeline/core/landing/`, e as ferramentas de `tools/landing/` do clone do toolkit são opcionais. O revisor de segurança do gate exige `security.md` com `## Triggers` e `security.baseline`: sem eles, deixe `security.diffGate: false`, como o template já traz.
7. **Outros agentes.** Se o projeto usa Codex, Gemini ou Grok, crie os symlinks `.agents/skills`, `.gemini/skills` e `.grok/skills` apontando para `../.claude/skills`.
8. **Deriva no gate.** Ponha `node .claude/pipeline/core/verify.mjs` no gate final do projeto (o comando de `gate.final`), para que edição à mão no core falhe. Se o projeto tem formatador ou linter, exclua deles `.claude/pipeline/core/` e `.claude/pipeline/toolkit.lock`: reformatar um arquivo do toolkit quebra o hash.
9. **Instruções.** No `CLAUDE.md` (ou `AGENTS.md`) do projeto, registre: o core, as skills e os agents `pipeline-*` vêm do Legend AI Toolkit na versão do lock; não se editam aqui; atualização pelo `prompts/02-atualizar.md` do toolkit.
10. **Confira.** Rode `/pipeline-doctor` e o gate do projeto; os dois verdes.
11. **Entregue.** Commit convencional (`chore: instala o Legend AI Toolkit <versão>`) e PR com o resumo do passo 3 e a deriva anotada no passo 2 (inclusive o que o `REMOVE` apagou de um core copiado à mão). O merge é do humano.
