# Regra de prova

## Por que a regra de prova

Ruído é o modo de falha dominante de revisão de segurança: laudo com achado sem caminho de exploração ensina quem o lê a pular o laudo, e isso destrói o gate. Achado sem os três campos é suposição, e suposição custa uma rodada do gate.

## Por que o passe de refutação

Achado que quem orquestra refuta com evidência custa uma rodada inteira e ensina todo mundo a ignorar o laudo.

## Por que threat model e baseline

Revisão de segurança sem threat model é opinião, e sem baseline repete risco já aceito.

## Por que o eixo supply-chain não usa a prova

Dependência vulnerável, runtime abaixo do mínimo e imagem sem pin não têm caminho de exploração no código do repositório: o defeito está fora dele, e o que o prova é a saída de uma ferramenta com base de dados, não a leitura de linhas. Exigir Attacker, Steps e Impact desses itens os calaria: o deploy que quebra porque o runtime está abaixo do mínimo de uma dependência nunca apareceria num sweep.

- A exceção é do core e vale só para o eixo `supply-chain`: o item tem evidência própria (comando e trecho da saída) e mora em `## Supply chain`, nunca em `## Findings`.
- A regra de prova não relaxa: todo achado de `## Findings`, em qualquer eixo e modo, segue com os três campos. Um `security.md` não cria exceção nova (`.claude/pipeline/core/profile-schema.md`, seção "As extensões").

## Armadilhas

- **Achado sem Steps.** "A rota não valida X" não é Steps. Steps é: qual request, com qual corpo, chega em qual linha, que
  aceita porque não há qual guard, e devolve o quê.
- **Não ler o baseline.** Reportar risco aceito é ruído com cara de rigor.
- **Inventar CVE de dependência.** Varredura de dependência é trabalho de ferramenta com base de dados, não de agente.
  Fora do eixo `supply-chain` (os outros eixos e o modo diff), é fora de escopo. No eixo, todo aviso cita a saída do
  comando declarado; sem essa saída, não há item, e id de aviso lembrado de memória é invenção.
