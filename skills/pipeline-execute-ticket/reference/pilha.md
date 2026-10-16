# A pilha

Motivos dos passos de `.claude/skills/pipeline-execute-ticket/SKILL.md`, seções "Entrada", "Argumentos", "A fila", "Fase 1 — O checkout local" e "Fase 3 — A branch". Nenhuma ação nova mora aqui.

## Um ticket, uma branch

- Dois tickets na mesma branch viram um PR irrevisável. Isso não muda por virem na mesma invocação: cada ticket tem a branch dele, o PR dele e o gate de revisão dele.
- O rigor é inteiro e o gate de revisão é justamente a parte barata.
- Numa pilha, o que muda de um ticket para o outro é só de onde a branch sai e contra o que o diff é medido; o resto do fluxo é o mesmo texto, lido de novo.

## A ordem é do usuário

- Ele escolheu a ordem; reordenar por número, dependência aparente ou tamanho é decidir no lugar dele.
- Se a ordem estiver errada, é ele quem corrige.

## Teto de 8 tickets por pilha

- O contexto do orquestrador cresce a cada ticket da pilha, e cada turno o relê inteiro; uma sessão nova por pilha o zera; sob o maestro, o executor ainda reinicia a cada ticket (`--parent`), então o teto vale para a invocação direta e para a série do maestro.
- O teto é fixo no core, não é chave do profile.
- O corte mantém a ordem do usuário: os 8 primeiros agora, o resto depois do merge, porque ticket de pilha posterior bloqueado por ticket aberto desta pararia do mesmo jeito (a exceção da mesma pilha cobre só os tickets entregues na mesma invocação ou ancestrais do `--parent`).

## O parent

- `<parent>` é a branch sobre a qual o ticket trabalha. Fora dos três lugares da checklist, `<branches.base>` continua sendo a base do profile.
- A branch do ticket anterior já existe no remoto, porque o `gh issue develop` dela nasceu lá.
- Cortar de qualquer outro lugar (a branch de um ticket que não é o anterior, uma branch de trabalho sua) faz o PR carregar commits que não são deste ticket.

## Por que a fila para

- Empilhar em cima de código que não passou no gate multiplica o retrabalho por quantos tickets vierem depois.

## Árvore limpa entre tickets

- Resto não commitado do ticket que acabou vira commit no ticket seguinte e some do PR onde deveria estar.

## Armadilhas

- **Começar com a árvore suja.** Pode ser trabalho não terminado do usuário. Pare e pergunte; `checkout -f` e `stash` cego destroem o que você não viu.
- **Cortar a branch de onde o `<parent>` não manda.** Ticket sozinho, ou primeiro da fila, sai de `<branches.base>`; empilhado (inclusive com `--parent`) sai da branch do ticket **imediatamente** anterior. Qualquer outra origem faz o PR carregar commits que não são deste ticket.
- **Cair no `git switch -c` por hábito.** A branch sai vinculada à issue só pelo `gh issue develop`, e o comando recusa branch que já existe — o vínculo esquecido na criação não se recupera sem apagar a branch.
- **Empilhar em cima de ticket que não fechou o gate.** O defeito vai junto para cada PR acima, e o conserto passa a exigir rebase da pilha inteira. Ticket que falha para a fila.
