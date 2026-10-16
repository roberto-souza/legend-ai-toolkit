# Ler o ticket e o blocker

Motivos dos passos de `.claude/skills/pipeline-execute-ticket/SKILL.md`, seções "A fila" e "Fase 2 — Ler o ticket". Nenhuma ação nova mora aqui.

## Issue de outro repositório

- Com `topology: polyrepo` o número sozinho não diz de qual irmão é a issue: há `#1` em todos. A URL carrega o repositório.
- Este fluxo não trabalha em repositório remoto, então a resposta é dizer onde chamá-lo. Uma URL completa de outro irmão recebe a mesma resposta.

## Blocker aberto

- O blocker é mergeado primeiro; senão a implementação nasce contra código que ainda não existe na `<branches.base>`.
- O cliente contra um endpoint que o servidor ainda não tem é exatamente o que a aresta existe para impedir.

## A exceção da mesma pilha

- O código do ticket anterior não está na `<branches.base>`, mas está no `<parent>`, a branch de onde esta sai: a aresta está satisfeita pela pilha, não pelo merge.
- Com `--parent`, vale todo blocker aberto com PR aberto cuja branch é o `--parent` ou ancestral dele (`git merge-base --is-ancestor <branch do blocker> <parent>` sai 0): o código dele está no `<parent>`, como na pilha de uma só invocação.
- Blocker que é ticket posterior da pilha significa que a ordem que o usuário mandou está invertida; reordenar sozinho decide no lugar dele.

## Blocker de outro repositório

- A aresta cruza repositórios e `blockedBy: [1]` não diz de qual irmão é o `1`; por isso a leitura é pela URL, não pelo número.
- Fechado não basta: issue fechada com o PR ainda aberto, ou mergeado noutra branch, não libera nada. O blocker precisa estar mergeado na base do repositório dele.
- `in:body` é busca livre: PR cujo corpo não referencia o `<m>` não prova nada, então o corpo do que voltar se abre.

## Ticket conjunto

- A linha `Joint ticket authorized by the requester:` é a prova de que o requerente pediu o ticket conjunto.
- Unidade a mais no campo sem a linha de autorização é ticket mal aberto.

## Armadilhas

- **Trabalhar a issue de um irmão a partir daqui.** Com `topology: polyrepo` a issue é do repositório onde você está; a outra se executa no diretório dela, noutra invocação.
- **Ler blocker de outro repositório pelo número.** `#1` existe em todos os irmãos; a aresta cruzada se lê pela `url`.
- **Trabalhar ticket assinado a outro dev.** O assignee é o sinal de que alguém já está nele. Pare e pergunte antes de assumir.

## Proposta visual ausente

- Codificar tela sem formato aprovado leva a negociação para depois do PR, onde cada rodada custa uma correção, uma revisão delta e uma revalidação inteira.
- A linha no corpo é a prova, porque o executor lê só a issue; ticket escrito antes da regra não tem a linha e é pego aqui.

## Comandos do blocker de outro repositório

Passos do passo 4 da Fase 2 de `.claude/skills/pipeline-execute-ticket/SKILL.md`:

4. Com `topology: polyrepo`, leia o blocker pela URL, `[.blockedBy.nodes[].url]`, e exija o PR mergeado na `<branches.base>` do repositório dele, não só a issue fechada; nunca pelo número, porque `#1` existe em todos os irmãos. Armadilha: `.claude/skills/pipeline-execute-ticket/reference/ticket-e-blocker.md`, seção "Armadilhas". Comandos:

   ```bash
   # 1. o PR que fechou o blocker, pelo próprio blocker
   gh issue view <m> --repo <owner>/<other repo> --json state,closedByPullRequestsReferences
   # 2. aquele PR, pelo número que o passo 1 devolveu
   gh pr view <pr> --repo <owner>/<other repo> --json state,baseRefName
   ```

   - Sem referência de fechamento (blocker fechado à mão, ou vínculo perdido), procure pelo texto e abra o corpo do que voltar:

     ```bash
     gh pr list --repo <owner>/<other repo> --search "<m> in:body" --state closed --json number,state,baseRefName,body
     ```

   - `state` ≠ `MERGED` ou `baseRefName` ≠ `<branches.base>` daquele repositório → o blocker segue de pé.
   - Detalhe: `.claude/skills/pipeline-execute-ticket/reference/ticket-e-blocker.md`, seção "Blocker de outro repositório".
