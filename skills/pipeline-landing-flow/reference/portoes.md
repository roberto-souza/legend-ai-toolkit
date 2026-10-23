# Portões da landing

O detalhe dos portões de `.claude/skills/pipeline-landing-flow/SKILL.md`: o que o solicitante aprova em cada fase, o que a aprovação libera, o artefato que fica e por que o portão existe.

## Portões

| Fase | O solicitante aprova | Bloqueia sem aprovação | Artefato |
| --- | --- | --- | --- |
| 1 Briefing | o briefing e as respostas da descoberta | a pesquisa | briefing em `<landing.handoff>` |
| 2 Pesquisa | o resumo das três pesquisas e o que saiu por conflito com `## Proibições` | o norte | três arquivos de pesquisa |
| 3 Norte | a direção, a página-régua e o tema (claro, escuro ou os dois) | o teardown | `## Referências` e `## Direção` do briefing |
| 4 Régua e teardown | a tradução da régua para a direção | a copy | o arquivo do teardown |
| 5 Copy | o texto, seção a seção | o teste de estilo e o protótipo | o texto, com a tabela afirmação → fonte |
| 6 Teste de estilo | o traço escolhido | o protótipo | a pasta `p<NN>/` do pedido, ou o registro de que não há ilustração |
| 7 Protótipo | a r1 com o placar | as rodadas | o protótipo e o laudo da r1 |
| 8 Rodadas | "o dono aprova e nada fica quebrado" | o handoff | o laudo com `## Parada` marcada |
| 9 Handoff | o manifesto | os tickets | `README.md` na raiz do handoff |
| 10 Tickets | o recorte, no portão do fluxo de tickets | o `/pipeline-execute` | contexto com o contrato fechado, issues |
| 11 Página construída | momento 1: topo e hero sem quebrado; momento 2: o dono aprova e nada fica quebrado | as seções (momento 1); o encerramento (momento 2) | os laudos da página construída |

Por que cada portão existe:

- **Briefing:** pesquisa sem o que só o solicitante sabe (preço, prova social, o que não dizer) busca no lugar errado.
- **Pesquisa:** o conflito com `## Proibições` sai aqui, antes de virar direção.
- **Norte:** o tema decide a arte; arte feita antes do tema vai fora, porque arte colorida invertida parece negativo.
- **Régua e teardown:** a sequência de seções e o movimento são decididos uma vez, antes do texto e do desenho.
- **Copy:** o designer usa o texto literal; texto aprovado depois do protótipo envelhece.
- **Teste de estilo:** o traço decidido num pedido pequeno, em camadas, evita refazer as camadas inteiras.
- **Protótipo:** protótipo sem placar é opinião; o validador roda desde a r1.
- **Rodadas:** a nota é termômetro; só a aprovação do dono com zero `[QUEBRADO]` encerra.
- **Handoff:** sem manifesto, ninguém sabe qual arquivo vale mais nem onde ele vive.
- **Tickets:** o contrato entre tickets fecha antes dos escritores; sem ele, cada corpo redefine os nomes.
- **Página construída:** o que passou por revisão, validação de tela e gate ainda quebra na página no ar (teclado, sem JavaScript, borda, larguras fora das fixas).

## Decisão datada e banner

Bloco em `## Decisões por rodada` do briefing:

```markdown
### Rodada <n> — <AAAA-MM-DD>

- <Decisão>, de <quem decidiu>; muda <documentos afetados>.
```

Banner no topo de cada documento que a decisão muda, logo abaixo do título:

```markdown
> Decisão <AAAA-MM-DD>: <frase da decisão>. Vale sobre o texto abaixo onde divergir.
```

Nunca substitua o texto antigo em lote: o banner deixa o rastro, e a próxima rodada reescreve o trecho com calma.
