# Branch e vínculo com a issue

Motivos e armadilhas dos passos de `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "A branch e o vínculo com a issue". Nenhuma ação nova mora aqui.

## Os dois modos de fechamento

A base de todo PR é `<branches.base>`. O que o `Closes #N` do corpo consegue fazer sozinho depende de `<closing.mode>`:

| `<closing.mode>` | Base do PR | O que o `Closes #N` faz | O que falta fazer à mão |
| --- | --- | --- | --- |
| `closes-keyword` | é a branch default | vincula o PR à issue e a fecha no merge | nada |
| `close-references-mutation` | não é a branch default | **nada** — o GitHub ignora a keyword fora da branch default | gravar o vínculo por mutation; o merge fecha pelo workflow |

Nos dois modos o `Closes #N` é obrigatório no corpo do PR: no primeiro é ele que vincula e fecha; no segundo é ele que o workflow de `<closing.workflow>` lê para saber qual issue fechar.

## Por que gh issue develop

- A branch sai da base no remoto e aparece no `Development` da issue desde o primeiro commit.
- Ela já vem rastreada, então o `git push` dispensa o `-u`.
- O vínculo não se acrescenta a uma branch existente: apagar e recriar é barato enquanto não há commit em cima.

## Branch que já existe

- `failed to create linked branch: API returned empty branch name`: em branch nova significa que a branch já existe, e o vínculo perdido não se recupera sem apagar e recriar a branch.
- Ao retomar um ticket o mesmo erro é esperado: a branch já existe e já está vinculada.

## Os dois vínculos coexistem

Com o PR aberto, o `linkedBranches` continua devolvendo a branch; quem troca é a sidebar, que passa a mostrar a linha do PR no lugar da branch. É apresentação, não perda de vínculo.

## A mutation addCloseIssueReferences

- Com base fora da branch default a keyword é ignorada inteira: a issue não fecha e o `Development` fica só com a branch.
- A mutation grava o mesmo vínculo do "link a pull request" da sidebar e aparece como `ConnectedEvent` no timeline da issue.
- É idempotente: rodar num PR já vinculado devolve sucesso e não duplica.
- Devolve `clientMutationId: null` mesmo quando não fez nada, por isso a resposta não prova o vínculo.
- `removeCloseIssueReferences` tem a mesma assinatura e desfaz o vínculo, mas apaga o `ConnectedEvent` em vez de gravar uma desconexão: o timeline não audita este vínculo.
- Sem a mutation, o `Development` fica só com a branch e o humano linka o PR à mão.

## deleteLinkedBranch

O motivo de o passo 7 listar antes de remover: a mutation desfaz só o vínculo, e a branch remota continua lá.
