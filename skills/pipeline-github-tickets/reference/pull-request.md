# Pull request

Modelos e motivos dos passos de `.claude/skills/pipeline-github-tickets/SKILL.md`, seções "Conclusão de um ticket" e "PR empilhado". Nenhuma ação nova mora aqui.

## Corpo do PR

Arquivo escrito antes com a ferramenta Write, em `<scratchpad>/pr-<n>-body.md`:

```markdown
<summary of the change>

## Also fixed

- <what was wrong> — `<path>` — <how it surfaced> — <why it was fixed here>

## Decisions

- <accepted trade-off, discarded alternative — only when there was one>

## Test plan

- ...

Closes #<n>
```

- `## Also fixed`: um item por correção (o que estava errado, caminho, como apareceu, por que foi corrigido aqui). Existe quando o diff corrigiu algo fora do ticket e some quando não corrigiu. É ela que responde, para quem lê o PR e a issue depois, por que o diff fez coisa a mais.
- `## Decisions` é **opcional** e recebe o porquê desta mudança: trade-off aceito, alternativa descartada, atalho consciente. Omita quando não houve decisão; não a preencha com resumo do que o PR faz, que já está no topo. Regra que vai sobreviver a este PR não é decisão de PR: vai para o module map ou para um ADR.
- `## Decisions` também carrega as linhas `NIT not applied: <título> (<arquivo>:<linha>)`; a regra mora em `.claude/skills/pipeline-execute-ticket/SKILL.md`, seção "A triagem".
- `## Test plan` e `Closes #<n>` ficam sempre.

## Comentário de conclusão

Também por arquivo (`<scratchpad>/comment.md`):

```markdown
PR: <url>

<2-4 sentence summary>

Also fixed in this PR:

- <what was wrong> — <why it was fixed here>
```

O bloco `Also fixed` do comentário existe só quando o corpo do PR tem `## Also fixed`.

## PR empilhado

- Empilhar é abrir o PR do ticket com base na branch do ticket anterior, para o diff mostrar só o que este ticket acrescenta. O que muda com `<closing.mode>` é como o vínculo com a issue sobrevive a isso.
- **Com `closing: closes-keyword`**, a referência de fechamento só é gravada quando o PR aponta para a branch default, aqui a `<branches.base>`. PR que já nasce empilhado fica sem vínculo, mesmo com o `Closes #N` certo no corpo.
- O sintoma é o card em `In review` sem o selo do PR e o `closedByPullRequestsReferences` vazio. Reeditar o corpo não resolve; o que grava é a base. O vínculo, uma vez criado, sobrevive ao retarget.
- As duas leituras provam: a primeira que o vínculo nasceu, a segunda que ele sobreviveu.
- **Com `closing: close-references-mutation`**, a base nunca deu o vínculo, quem dá é a mutation; por isso o PR pode nascer na branch pai e não há dança de retarget.
- O fechamento fica sem automação enquanto o PR estiver empilhado: o workflow de `<closing.workflow>` roda no merge de PR cuja base é `<branches.base>` e lê o corpo daquele PR. O empilhado que entra na branch pai não o dispara, e o PR pai fecha só a issue que o corpo dele cita.
