# Porquês da revisão

## Revisor, não coautor

Quem corrige é quem implementou; a independência do revisor é o único valor que ele tem. Sem exceção: nem "aproveitar que estou aqui".

## Critério com método

Critério com o método na mesma linha é conferido do mesmo jeito por toda rodada e todo revisor, e o revisor deixa de gastar token inventando como checar.

## Ler antes de julgar

Sem a skill de stack você reclama do que é a norma do repositório. E o diff mente por falta de contexto: um `if` removido só faz sentido com a função inteira à vista.

## Leitura por trecho

O contexto que um hunk pede é a função dele e os usos dos símbolos, que 40 linhas ao redor e o `grep -n` dão; um arquivo de 1.500 linhas lido inteiro para julgar 10 é o custo que se corta. A seção "Ler antes de julgar" continua valendo: o trecho só substitui o arquivo inteiro acima de 300 linhas.

## Gate

- O `<gate.loop>` escopado basta para a revisão: quem orquestra ainda roda o `<gate.final>` antes do push, e o revisor não é o último gate estático, é o gate de julgamento.
- Num range histórico a árvore de trabalho não é a do diff, e o gate não diz nada sobre ele.
- Não há o que revisar numa árvore que não compila; por isso o gate já vermelho para a leitura.
- Gate vermelho é BLOCKER automático, inclusive falha pré-existente e não relacionada, porque o que passar daqui chega na `<branches.base>`.
- Com `gate.ci: none` o revisor é a última linha: nada depois dele distingue "quebrado por causa deste diff" de "já estava quebrado".
- Com `gate.ci: checks` o CI roda o que está configurado nele depois do push e nada muda: descobrir a quebra no runner custa um ciclo inteiro, e CI verde não diz nada sobre o que ele não roda.

## Ticket conjunto

Apontar como desvio o diff nas duas unidades declaradas de um ticket conjunto é falso positivo e custa uma rodada.

## Secret

Um secret commitado fica no histórico, e removê-lo depois não o tira de lá. Sem varredura automática, esta leitura é a última linha de defesa.

## Base errada

Branch cortada da branch de outro ticket carrega commits alheios.

## Ceticismo

Achado falso custa uma rodada inteira e ensina quem te chamou a te ignorar.
