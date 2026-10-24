# 02 — Atualizar o Legend AI Toolkit num projeto

## Quando usar

O projeto já tem `.claude/pipeline/toolkit.lock` e o toolkit tem versão nova (veja `VERSION` e `CHANGELOG.md`).

## Prompt

Cole na sessão do agente, na raiz do projeto:

```text
Leia https://raw.githubusercontent.com/roberto-souza/legend-ai-toolkit/main/prompts/02-atualizar.md e execute a seção "O que o agente faz" neste repositório.
```

Com um clone local do toolkit, troque a URL pelo caminho dele. Nos passos abaixo, `<TOOLKIT>` é esse clone, atualizado (`git -C <TOOLKIT> pull`); sem clone, `git clone --depth 1 https://github.com/roberto-souza/legend-ai-toolkit <pasta temporária>`.

## O que o agente faz

1. **Confira o terreno.** Raiz do repositório, branch nova (`chore/<n>-atualiza-legend-ai-toolkit`), árvore limpa.
2. **Deriva primeiro.** Rode `node .claude/pipeline/core/verify.mjs`. Se falhar, alguém editou o core aqui: leve a mudança para o toolkit (PR lá) ou descarte-a, com o humano decidindo; nunca a apague em silêncio.
3. **Veja a diferença.** Leia, no `CHANGELOG.md` do toolkit, as entradas entre a `version` do lock e o `VERSION` novo (as mesmas estão nas releases: https://github.com/roberto-souza/legend-ai-toolkit/releases). Major novo quebra o contrato do profile: ajuste o `profile.yml` como a entrada manda, no mesmo PR.
4. **Atualize.** `node <TOOLKIT>/scripts/install.mjs --to . --check`, depois `node <TOOLKIT>/scripts/install.mjs --to .`. Revise o `git diff`: só arquivos do toolkit, o lock e, no `.claude/settings.json`, o gancho ou o `env` que faltava (`HOOK`, `ENV`) e o gancho de retomada tirado de um profile sem `team:` (`UNHOOK`).
5. **Confira.** `/pipeline-doctor` e o gate do projeto, os dois verdes.
6. **Entregue.** Commit `chore: atualiza o Legend AI Toolkit para <versão>` e PR com as entradas do changelog e o link de cada release. O merge é do humano.
