# Página construída

Procedimento da Fase 11 de `.claude/skills/pipeline-landing-flow/SKILL.md`: a rubrica na página construída, em dois momentos.

## Os dois momentos

1. **Momento 1 — topo e hero.** Roda quando o ticket do esqueleto, do topo e do hero está mergeado e servido. Sem `[QUEBRADO]` no topo e no hero, as seções podem ir a Ready; com quebrado, elas continuam bloqueadas.
2. **Momento 2 — página inteira.** Roda quando todos os tickets da pilha estão mergeados. Encerra com "o dono aprova e nada fica quebrado".

## A URL

1. Pergunte ao solicitante a URL do alvo (ambiente de prévia ou produção); nunca invente ambiente.
2. `## Página no ar` só se aplica à página em produção, no domínio final; em prévia, registre a seção como não aplicável.

## Passos fixos

O validador recebe `Alvo: página construída`, `<landing.widths>`, `<landing.sweepWidths>` e os passos da rubrica, que o modelo de validação já traz como seções:

1. `## Varredura`: sobreposição e rolagem horizontal em cada largura de `<landing.sweepWidths>`, rolando para baixo e para cima, com o primeiro e o último quadro do hero e o erro de console.
2. `## Teclado e sem JavaScript`: teclado (Tab e Shift+Tab, Esc fecha o que abre, o foco entra e volta, Tab não escapa de folha ou diálogo aberto, foco visível); sem JavaScript (conteúdo visível, nenhum controle que aparece e não faz nada, nenhum estado inicial de animação escondendo conteúdo); `prefers-reduced-motion`.
3. `## Página no ar`: cada redirecionamento de borda da linha `- **Bordas:**` de `## Hospedagem` da extensão `landing.md` conferido com `curl -I`, com o status e o `Location` esperados (resposta diferente é `[QUEBRADO]`); as tags e os arquivos de indexação que o relatório de SEO prometeu.
4. Fidelidade ao protótipo aprovado: diff do texto visível e cada diferença de desenho classificada melhora, neutra ou piora.

## Cada quebrado

1. Cada `[QUEBRADO]` vira ticket de correção pelo fluxo de tickets (`.claude/skills/pipeline-write-ticket/SKILL.md`, a partir do Pré-voo dele, como na Fase 10), com o `Type` de correção do profile; nunca item solto, nunca correção feita por esta skill.
2. O corpo do ticket leva o item do laudo (passo, onde, evidência) e a correção de `## Correções`.
3. Depois do merge, rode o mesmo momento de novo: um laudo novo, com delta contra o anterior.
4. `[AJUSTE]` vai ao solicitante como lista; vira ticket só se ele pedir.

## Fechamento

1. O laudo do momento 2 compara a nota de cada seção com a do último laudo do protótipo; a diferença é registro, não critério.
2. Encerra quando o dono aprova em texto e `## Quebrado` está vazio; registre a data no briefing, em `## Decisões por rodada`.
