# Regra de prova

## Por que a regra de prova

Ruído é o modo de falha dominante de revisão de segurança: laudo com achado sem caminho de exploração ensina quem o lê a pular o laudo, e isso destrói o gate. Achado sem os três campos é suposição, e suposição custa uma rodada do gate.

## Por que o passe de refutação

Achado que quem orquestra refuta com evidência custa uma rodada inteira e ensina todo mundo a ignorar o laudo.

## Por que threat model e baseline

Revisão de segurança sem threat model é opinião, e sem baseline repete risco já aceito.

## Armadilhas

- **Achado sem Steps.** "A rota não valida X" não é Steps. Steps é: qual request, com qual corpo, chega em qual linha, que
  aceita porque não há qual guard, e devolve o quê.
- **Não ler o baseline.** Reportar risco aceito é ruído com cara de rigor.
- **Inventar CVE de dependência.** Varredura de dependência é trabalho de ferramenta com base de dados, não de agente.
  Fora de escopo.
