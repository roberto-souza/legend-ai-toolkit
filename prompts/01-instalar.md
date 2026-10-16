# 01 — Instalar o Legend AI Toolkit num projeto

## Quando usar

O projeto ainda não tem `.claude/pipeline/toolkit.lock`. Pode já ter um core copiado à mão: a instalação o substitui pela versão do toolkit e o diff mostra a diferença.

## Prompt

Cole na sessão do agente, na raiz do projeto:

```text
Leia <TOOLKIT>/prompts/01-instalar.md e execute a seção "O que o agente faz" neste repositório.
```

`<TOOLKIT>` é o caminho do clone local do toolkit (por exemplo `~/Development/Utils/legend-ai-toolkit`). Quando o repositório tiver remoto, troque por `<URL-DO-REPO>/raw/main` e clone o toolkit numa pasta temporária no primeiro passo.

## O que o agente faz

1. **Confira o terreno.** Esteja na raiz de um repositório git, numa branch nova (`chore/<n>-legend-ai-toolkit` ou a convenção do projeto), com a árvore limpa. Se o toolkit veio por URL, clone com `git clone --depth 1 <URL-DO-REPO> <pasta temporária>` e use essa pasta como `<TOOLKIT>`.
2. **Veja antes de escrever.** Rode `node <TOOLKIT>/scripts/install.mjs --to . --check` e mostre o que vai mudar (`ADD`, `CHANGE`, `REMOVE`, `HOOK`). Arquivo `CHANGE` de um core copiado à mão é deriva: anote para o PR.
3. **Instale.** Rode `node <TOOLKIT>/scripts/install.mjs --to .`. O script copia o core, as skills e os agents `pipeline-*`, grava `.claude/pipeline/toolkit.lock` e mescla os ganchos do gate em `.claude/settings.json`. Não toca em `profile.yml`, nas extensões nem em outra skill.
4. **Profile.** Se `.claude/pipeline/profile.yml` não existe, copie `<TOOLKIT>/templates/pipeline/profile.yml` e preencha **com fatos lidos do projeto**: `repo` pelo `gh repo view`, ids do board pelo `gh project field-list`, `gate.loop` e `gate.final` pelos scripts reais do projeto, `knowledge` pelos arquivos que existem. Chave sem fato conhecido: pergunte ao humano, nunca invente. As extensões (`rules.md`, `ticket.md`, `security.md`, `verification.md`) só entram se o projeto quiser; o template de cada uma está ao lado do profile.
5. **Outros agentes.** Se o projeto usa Codex, Gemini ou Grok, crie os symlinks `.agents/skills`, `.gemini/skills` e `.grok/skills` apontando para `../.claude/skills`.
6. **Deriva no gate.** Ponha `node .claude/pipeline/core/verify.mjs` no gate final do projeto (o comando de `gate.final`), para que edição à mão no core falhe.
7. **Instruções.** No `CLAUDE.md` (ou `AGENTS.md`) do projeto, registre: o core, as skills e os agents `pipeline-*` vêm do Legend AI Toolkit na versão do lock; não se editam aqui; atualização pelo `prompts/02-atualizar.md` do toolkit.
8. **Confira.** Rode `/pipeline-doctor` e o gate do projeto; os dois verdes.
9. **Entregue.** Commit convencional (`chore: instala o Legend AI Toolkit <versão>`) e PR com o resumo do passo 3 e a deriva anotada no passo 2. O merge é do humano.
