# Rubrica da landing

Régua do validador da landing, no protótipo e na página construída. Lida pelo validador e pelos portões da skill de landing, e citada pelo modelo de validação. A nota é juízo; o defeito é fato; quem aprova é o dono.

## Critérios

Quatro critérios, avaliados por seção:

- **Beleza:** acabamento visual: hierarquia, espaçamento, alinhamento, contraste, consistência entre seções e fidelidade ao taste.
- **Clareza:** quem chega entende rápido o que o produto faz e a quem serve, pelo que dizem `## Produto` e `## Público` da extensão `landing.md`.
- **Vendas:** a seção leva à `- **Ação única:**` de `## Ação`, sem desviar para outra ação.
- **Desejo:** dá vontade em quem decide (`## Público`), sem recurso que o taste veta.

## Escala

- 0 a 10, com passo de 0,5, por critério e por seção.
- Média da seção: média simples dos quatro critérios. Média geral: média das seções.
- 8 ou mais só se entregaria a um cliente exigente; 10 é raro.
- A mesma régua em toda rodada; `Delta` compara com a média do laudo anterior.
- Meta de 8 por seção **não** é critério de parada.

## Nota e defeito

- **Nota** é juízo, vive no `## Placar` e é **termômetro**: mostra a direção, não decide nada. Nota alta convive com defeito, e o placar sozinho não aprova nem reprova.
- **Defeito** é fato reproduzível: um passo fixo falha, ou um veto de `## Proibições` ou do taste é violado. Vem com o passo, a largura e a evidência.
- `[QUEBRADO]` impede aprovar. `[AJUSTE]` melhora sem impedir.
- Defeito nunca é descontado da nota em silêncio: ele entra na lista, e a nota segue sendo juízo.
- Quem aprova é o dono, com zero `[QUEBRADO]`.

## Passos fixos

Rodam no protótipo e na página construída, nas larguras fixas `<landing.widths>`; a varredura usa `<landing.sweepWidths>`.

  1. Renderizar cada seção em cada largura de `<landing.widths>`, nas variantes de tema que o briefing declara; rolar para baixo **e para cima** (há elemento que só aparece ao subir) e capturar o primeiro e o último quadro de toda animação de entrada.
  2. Varredura de `<landing.sweepWidths>`: caixa de ilustração contra caixa de texto e de mock, e `scrollWidth` contra a largura da janela; nenhuma sobreposição, nenhuma rolagem horizontal.
  3. **Teclado**: percorrer só com Tab, Shift+Tab, Enter, Espaço, setas, Home/End e Esc; foco visível e em ordem; o que abre (menu, folha, diálogo) recebe o foco, fecha com Esc e com toque fora, devolve o foco a quem abriu, e Tab não escapa dele.
  4. **Sem JavaScript**: desligar o JS e recarregar; todo conteúdo legível, nenhum controle que não faz nada, nenhum estado inicial de animação escondendo texto ou mock (o estado final de um mock é o padrão, o inicial só sob script).
  5. Movimento reduzido: com `prefers-reduced-motion`, nada anima e tudo aparece.
  6. Console: zero erro em cada largura.
  7. Só no alvo `página`: fidelidade ao protótipo (diff do texto visível sem espaços; cada diferença de desenho classificada melhora, neutra ou piora); redirecionamentos de borda de `- **Bordas:**` (`## Hospedagem` da extensão `landing.md`) por `curl -I` (http para https, `www`, domínio de origem); indexação (título, descrição, canonical, um só H1, dado estruturado válido, `llms.txt`, `robots.txt`, sitemap, 404 real, imagem de compartilhamento).
  8. Vetos: `## Proibições` e taste conferidos no que se vê (dado inventado em mock, nome de pessoa, preço, depoimento).

O passo de teclado e o sem JavaScript valem em toda rodada; nenhum dos dois se pula por falta de tempo.

## Laudo

O laudo é o modelo de validação (`validacao.md`, nesta mesma pasta) preenchido, com os títulos e a ordem dele.

- **Alvo:** `protótipo` ou `página construída`. **Larguras fixas** e **Varredura** recebem `<landing.widths>` e `<landing.sweepWidths>`.
- `## Placar`: uma linha por seção, do topo ao rodapé, mais os estados que existirem (menu, barra móvel, 404). `Rodada anterior` é a média da mesma linha no laudo anterior (`novo` na primeira rodada, com `Delta` `—`) e `Delta` a diferença. Fecha com `Média geral: <n>`, só das seções; as linhas de estado não entram nela.
- `## Quebrado`: **só `[QUEBRADO]`**, do mais grave ao menos grave. Cada item é `N. [QUEBRADO] <título de uma linha>` e, abaixo, `- Passo:` (o passo fixo ou o veto), `- Onde:` (seção e largura) e `- Evidência:` (comando com o código de saída, captura ou saída, sem repetir o esperado). Essa forma substitui a linha de exemplo do modelo; sem nenhum `[QUEBRADO]`, a seção traz só `Nenhum.`
- `## Correções`: um bullet por defeito, na forma em que quem implementa não decide nada (elemento, valor, regra). Os de `## Quebrado` levam `[QUEBRADO]`; os `[AJUSTE]` vivem **só aqui**, com o prefixo `[AJUSTE]`.
- `## Varredura`, `## Teclado e sem JavaScript` e `## Página no ar`: como o modelo manda; a tabela por largura, as caixas marcadas só quando verificadas. `## Página no ar` existe só no alvo `página`; no protótipo a seção é omitida.
- `## Parada`: o validador marca `Quebrado está vazio.` quando não há `[QUEBRADO]`, e **nunca** marca `O dono aprovou.`: é do dono.
- A última linha do arquivo vem sozinha: `VALIDAÇÃO DE LANDING <protótipo|página> r<k>: média <n>/10 — <q> quebrados — laudo em <caminho>`, com `<q>` igual à quantidade de itens em `## Quebrado` (`[AJUSTE]` não conta).
- Faltou algo para rodar (alvo inacessível, sem navegador): nenhuma outra escrita, e a linha `VALIDAÇÃO DE LANDING INTERROMPIDA: <o que falta>`.

## Armadilhas

- Rolar só para baixo esconde a barra que aparece ao subir.
- Dado real do dono (um contato verdadeiro) lido como placeholder: avise que é dado real.
- Sobreposição que só aparece em algumas larguras: a varredura existe por isso.
- Seção fundida quebra a numeração da navegação.
- Captura do estado inicial de uma animação confundida com defeito: compare com o quadro final.
