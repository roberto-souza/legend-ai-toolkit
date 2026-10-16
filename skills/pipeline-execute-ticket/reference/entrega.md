# Entrega: porquês e armadilhas

Motivos e armadilhas das seções "Fase 6 — Validação e PR" e "Fase 7 — Entregar e parar" de `.claude/skills/pipeline-execute-ticket/SKILL.md`. Nenhuma ação nova mora aqui.

## Checklist da Fase 6

- O item 6 existe porque o `Development` da issue vazio nos dois (branch e PR) quer dizer que a branch nasceu de `git switch -c`. O que ficou para trás foi a janela entre o primeiro commit e o PR.

## CI e veredito

- O nome do job vermelho já diz o que quebrou; não abra o log inteiro antes disso.
- Run cancelado por force-push não é falha: deixe o run novo concluir antes de intervir.
- CI verde não é aceite: ele roda só o que está configurado nele. Com `gate.tests: false`, o comportamento de cada cenário continua sendo verificado só por você.

## Armadilhas

- **Pular o `<gate.final>` da Fase 6 porque o `<gate.loop>` ficou verde.** O escopado só roda o que o diff toca; quebra em pacote vizinho passa por ele inteira.
- **Abrir PR sem `Closes #<n>`.** Sem ele o PR não fica vinculado, a issue não fecha e o card não sai de `In review`.
- **Abrir PR empilhado já com base na branch anterior, com `closing: closes-keyword`.** O `Closes #<n>` é ignorado fora da branch default e a issue fica sem PR — sintoma: card em `In review` sem o selo do PR. Nasce em `<branches.base>`, confere o vínculo, depois retargeta.
- **Achar que o `Closes #<n>` vinculou o PR com `closing: close-references-mutation`.** Ele não vincula: o `Development` da issue fica só com a branch até a mutation rodar (pulou: o humano linka o PR à mão). E a mutation responde sucesso sem fazer nada — a prova é a leitura.
- **Abrir PR contra `<branches.default>` quando ela não é a `<branches.base>`.** Quebra o fluxo e, em muitos repositórios, dispara deploy.
- **Corpo de PR em heredoc, ou texto com `gh pr merge` no mesmo comando.** Bloqueado: `.claude/pipeline/core/seals.md`.
- **Rebase da pilha depois de uma correção embaixo.** Derruba os selos das branches de cima: `.claude/pipeline/core/seals-reference.md`, seção "Armadilhas".

## Checklist da Fase 6: itens

Passos do passo 3 da Fase 6 de `.claude/skills/pipeline-execute-ticket/SKILL.md`:

3. Confira o checklist, com evidência por item; falhou um, volte à Fase 4:
   1. Cada critério de aceite, com evidência (arquivo:linha, nome do teste, ou o que você viu ao percorrer).
   2. Cada cenário de teste da spec tem teste correspondente, **os de erro inclusive**; cenário com o marcador de verificação de `ticket.md` é cumprido pela evidência anotada, não por teste. Com `gate.tests: false`, cada cenário foi **percorrido**, os de erro inclusive, com a evidência anotada.
   3. Todo arquivo do diff está em "Affected files" ou é coberto por um item de `Also fixed`.
   4. Checagens marcadas no ticket cumpridas, conforme o que `rules.md` diz de cada uma.
   5. Module map do módulo tocado atualizado.
   6. O `Development` da issue tem o vínculo: a branch (`gh issue develop <n> --list`) ou, já com o PR aberto, o próprio PR → vazio nos dois, a branch nasceu de `git switch -c`. Detalhe: `.claude/skills/pipeline-execute-ticket/reference/entrega.md`, seção "Checklist da Fase 6".
   7. `<gate.final>` inteiro verde, rodado agora — não o `<gate.loop>`.
   8. Sem secret no diff **e** no histórico da branch.
