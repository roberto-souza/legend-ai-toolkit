# 02 — Atualizar o Legend AI Toolkit num projeto

## Quando usar

O projeto já tem `.claude/pipeline/toolkit.lock` e o toolkit tem versão nova (veja `VERSION` e `CHANGELOG.md`).

## Prompt

Cole na sessão do agente, na raiz do projeto:

```text
Leia <TOOLKIT>/prompts/02-atualizar.md e execute a seção "O que o agente faz" neste repositório.
```

`<TOOLKIT>` é o caminho do clone local do toolkit, atualizado (`git -C <TOOLKIT> pull`). Com remoto, troque por `<URL-DO-REPO>/raw/main` e clone numa pasta temporária.

## O que o agente faz

1. **Confira o terreno.** Raiz do repositório, branch nova (`chore/<n>-atualiza-legend-ai-toolkit`), árvore limpa.
2. **Deriva primeiro.** Rode `node .claude/pipeline/core/verify.mjs`. Se falhar, alguém editou o core aqui: leve a mudança para o toolkit (PR lá) ou descarte-a, com o humano decidindo; nunca a apague em silêncio.
3. **Veja a diferença.** Leia, no `CHANGELOG.md` do toolkit, as entradas entre a `version` do lock e o `VERSION` novo. Major novo quebra o contrato do profile: ajuste o `profile.yml` como a entrada manda, no mesmo PR.
4. **Atualize.** `node <TOOLKIT>/scripts/install.mjs --to . --check`, depois `node <TOOLKIT>/scripts/install.mjs --to .`. Revise o `git diff`: só arquivos do toolkit, o lock e, se faltava, um gancho.
5. **Confira.** `/pipeline-doctor` e o gate do projeto, os dois verdes.
6. **Entregue.** Commit `chore: atualiza o Legend AI Toolkit para <versão>` e PR com as entradas do changelog. O merge é do humano.
