# Board

Motivos dos passos de `.claude/skills/pipeline-github-tickets/SKILL.md`, seções "O board", "Mover o card" e "Regras de transição". Nenhuma ação nova mora aqui.

## Status

- O estado do trabalho vive em dois lugares e só neles: a **issue** (a spec) e o **campo Status do Project** (a visão). Label de estado duplicaria o que o board já diz, e `gh issue edit --add-label` falha em label inexistente.
- A trava de repositório do `pipeline-project-profile` já rodou; é ela que impede o comando certo de escrever no board errado.

| Status | option-id | Significado |
| --- | --- | --- |
| `Backlog` | `<board.statusOptions.Backlog>` | escrito, ainda não liberado |
| `Ready` | `<board.statusOptions.Ready>` | revisado pelo humano, liberado para execução |
| `In progress` | `<board.statusOptions.In progress>` | agente trabalhando, issue assinada a quem começou |
| `In review` | `<board.statusOptions.In review>` | PR aberto, aguardando review humano |
| `Done` | `<board.statusOptions.Done>` | issue fechada pelo `Closes #N` no merge do PR |

## Mover o card

- O `item-add` é idempotente e devolve o ITEM id: não há corrida de indexação. A URL dele também carrega o repositório (`https://github.com/<repo>/issues/<n>`), e é por isso que é o caminho preferido: não há filtro para esquecer.
- **Corrida real:** o board leva um instante para indexar. Encadear `item-add` e `item-list` no mesmo bloco devolve vazio, e o `item-edit` vira no-op **silencioso** com exit 0.
- **O filtro por `.content.repository` não é opcional com `topology: polyrepo`:** o board é de vários repositórios e há `#1` em todos eles; sem o filtro você move o card do repositório errado.
- O valor do filtro é o **nameWithOwner** (`<repo>`), não o nome curto: comparar com o nome curto não casa nada, `$ITEM` vem vazio e o `item-edit` vira o no-op silencioso.
- O campo `repository` do nível de cima do item é a URL completa; não é esse que se filtra.
- Com `topology: monorepo` o filtro é inócuo e fica assim mesmo: número de issue de outro repositório no mesmo board custa o mesmo erro.

## Regras de transição

- `In review` já ocupado: ou o ticket está em voo em outro lugar, ou é retrabalho que você não deveria começar sozinho. Por isso é decisão humana.
- `@me` resolve o dono do token do `gh`: o comando é o mesmo para qualquer dev e nunca carrega login fixo. Assumir ticket de outro dev é decisão humana, igual ao caso do `In review`.
- `Done` chega sozinho porque o workflow embutido do Project reage ao fechamento da issue.
- O estado real é a issue e o PR; o board é a visão, então falha de board não justifica alternativa inventada.
