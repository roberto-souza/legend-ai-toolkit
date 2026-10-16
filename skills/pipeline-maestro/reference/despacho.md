# Despacho e acompanhamento: motivos

Os motivos dos passos de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Despacho e acompanhamento". Os passos e os comandos moram lá.

## O maestro faz fetch e switch

- O `git fetch` e o `git switch` da branch do PR são do maestro, no checkout principal, porque o sandbox de escrita do validador de API não escreve em `.git`.
- Só o maestro sobe o ambiente de dev, no checkout principal: o motivo é a colisão de porta com o checkout principal (a armadilha completa, com o sintoma: parágrafo **Servidor do executor no clone.** de `.claude/skills/pipeline-maestro/reference/armadilhas.md`, seção "Ambiente de dev").
- O pedido de capturas vai ao executor porque ele roda o script em minutos, onde o roteiro de portal levava cerca de 1 h por PR, e sem os artefatos do portal sem foco. O motivo do script: `.claude/skills/pipeline-maestro/reference/captura.md`, seção "Captura pelo script".

## Um executor limpo por ticket

- Todo ticket começa com o executor reiniciado: o contexto do orquestrador cresce a cada ticket e cada turno relê tudo.
- A correção de um PR da pilha também sobe um executor reiniciado: o implementador novo recebe brief e `git diff` da branch, então não precisa do mesmo executor.

## O roteamento lê o check

- Etapa descrita em prosa se perde: numa sessão longa, uma etapa que só está em prosa é pulada. O selo é a trava, e o roteamento lê a saída do `check` em vez de lembrar da lista de etapas.

## Portais do validador de reserva

- O portal fica ligado a quem o cria, e o validador de reserva não usa os portais do principal; por isso recebe a lista de `<team.portals>` com cada `name` acrescido de ` 2`.

## Sem notify por PR

- Avisar PR por PR convidaria ao merge parcial.

## A pilha inteira antes do merge

- A pilha inteira fica disponível para correção: um bug achado na validação de um PR de baixo é corrigido na branch certa, e não num PR de cima nem depois do merge.

## Por que conferir a release

- A marca dos documentos de andamento quer dizer "entregue e em produção", e documento defasado é bug.

## O maestro acorda só por evento

- Cada despertar relê o contexto inteiro do maestro; despertar por PR e `maestri check` em laço multiplicam o custo.
- O script grava o andamento na nota, que é o estado; o maestro lê a nota quando precisa, não o chat.
- A validação começa no `PILHA PRONTA`, não por PR: o solicitante aceitou essa consequência.
- O sentinela do maestro para no `PILHA PRONTA`, no `CAPTURAS PRONTAS` e no `TRAVADO`, porque um executor parado durante a validação levantaria `STALLED` a cada 20 minutos.

## Uma sessão por demanda

- Demanda é o que o humano pediu ao maestro numa invocação: uma pilha, ou uma série cortada em pilhas.
- Uma sessão nova por demanda zera o contexto, que de outro modo carregaria o histórico da anterior.
- A nota é o estado: a sessão nova retoma dela e nunca do histórico da conversa.
- As pilhas de uma mesma demanda dividem a sessão do maestro, e cada uma reinicia o executor.

## Passos da release publicada

Notação de `.claude/skills/pipeline-maestro/SKILL.md` (`<raiz>`, `<EXEC>`, `<gate>`, `<crit>`...). Passos:

1. Depois de cada release de produção concluída (como o `README.md` a define) e **só quando** `.claude/pipeline/ticket.md` tem a seção `## Andamento`; sem ela, esta seção não se aplica.
2. Confira o que entrou em produção, pelos PRs da release (release notes, ou os merges na base desde a anterior) e pelas issues que eles fecham.
3. Abra um ticket de andamento pelo escritor sob demanda ("Escritor de tickets sob demanda"), ou inclua a marcação no próximo PR de docs já previsto.
4. O conteúdo é a marca dos itens entregues nos documentos de andamento (apontados por `ticket.md`, seção `## Andamento`), com a data. → nunca marque item entregue só em parte nem de release futura.
5. O ticket vai para a nota (`## Fila` ou `## Decisões`). O maestro dispara o ticket e não edita o documento. Detalhe: `.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Por que conferir a release".

## Passos do escritor de tickets

Passos dos passos (os números são os de `.claude/skills/pipeline-maestro/SKILL.md`):

2. Com o papel declarado, recrute, **sem `--role`**, na raiz do checkout principal (`git rev-parse --show-toplevel`, no Ground):
   `maestri recruit "[TICKET] <team.roles.ticketWriter.tool>" --command "<team.roles.ticketWriter.command>" --dir <raiz do checkout principal>`.
   Com `<team.roles.ticketWriter.model>` declarado, rode `maestri check "[TICKET] <team.roles.ticketWriter.tool>"` e confira
   no cabeçalho do terminal que o modelo é esse, como no passo **Conferir o executor.** de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Setup do time"; não é → dispense e recrute de novo.
3. Mande a demanda: `maestri ask "[TICKET] <team.roles.ticketWriter.tool>" "/pipeline-ticket <demanda>"`.
4. **O humano responde as perguntas direto nesse terminal.** O maestro acompanha com `maestri check` e não responde por ele.
5. Com os tickets criados, mova para `Ready` no board **só o que o humano autorizou** (`.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Mover o card"); o resto fica em `Backlog`.
6. Dispense o terminal: `maestri dismiss "[TICKET] <team.roles.ticketWriter.tool>"`. O escritor não fica parado no canvas.

## Passos do validador de reserva

Passos dos passos (os números são os de `.claude/skills/pipeline-maestro/SKILL.md`):

2. Recrute **sem `--role`**: `maestri recruit "[VALIDADOR 2] <team.roles.validatorBackup.tool>" --command "<team.roles.validatorBackup.command>" --dir <raiz do checkout principal>`, com `{root}` trocado pela raiz do checkout principal (`git rev-parse --show-toplevel`, no Ground); o "trust this folder" se responde com `maestri ask "<terminal>" --raw "\n"`.
3. Mande por `maestri ask` o papel de quem caiu, resolvido: `.claude/skills/pipeline-maestro/roles/validador-api.md` ou `.claude/skills/pipeline-maestro/roles/validador-ui.md`.
4. Ligue-o à nota, como os validadores principais: `maestri connect "[VALIDADOR 2] <team.roles.validatorBackup.tool>" "<team.note>"`.
5. Despache a ele o mesmo roteiro, com o comando de selo do papel que substitui (passo 8 de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Roteamento por tipo de PR").
   - Substituindo o de tela: a lista de `<team.portals>` com cada `name` acrescido de ` 2`, e o roteiro cita cada portal pelo nome acrescido de ` 2`.
   - Substituindo o de API: sem portal.
   - Detalhe: `.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Portais do validador de reserva".
6. A nota registra, no item do PR, quem validou.

## Eventos do sentinela

Passos do passo 8 de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Fila e despacho":

8. **Eventos.** O maestro só age nas linhas do sentinela:
   - `PILHA PRONTA: …` de ticket que não é o último → pare o `Monitor`, anote o PR em `## Em execução` e siga o passo 6.
   - `PILHA PRONTA: …` do último ticket, ou de correção → pare o `Monitor`; para cada PR da pilha, na ordem de merge (`.claude/skills/pipeline-github-tickets/SKILL.md`, seção "PR empilhado"), siga "PR aberto pelo executor" e troque a linha do sentinela em `## Em execução` pelo item de "Nota de estado".
   - `CAPTURAS PRONTAS: …` → pare o `Monitor` e siga "Validação de tela", passo 3; resposta a pedido de reproduzir passo pontual → passo 6.
   - `TRAVADO: <motivo>` → pare o `Monitor`, `maestri notify` e leve a pergunta ao usuário; com a resposta mandada ao executor, re-arme.
   - `STALLED` → um `maestri check`; parado de fato → **uma** cutucada por `maestri ask`; segundo `STALLED` depois dela → trate como `TRAVADO` (`.claude/skills/pipeline-execute-ticket/SKILL.md`, seção "O sentinela").
   - `check failed` ou `note edit failed` → confira o terminal e a nota (`maestri check`/`maestri note read`), re-arme e ponha à mão a linha de PR que falhou.
