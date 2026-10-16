# Implementar — referência

Motivos da `## Fase 4 — Implementar` de `.claude/skills/pipeline-execute-ticket/SKILL.md`. Nenhuma ação nova mora aqui.

## Divisão de papéis

- O desenho fica com o modelo mais forte porque erro de abordagem é o mais caro e o que o revisor menos pega.
- O volume de leitura, edição e gate fica com o mais barato.
- O revisor roda num esforço maior porque é o julgamento dele que acha o defeito; o valor mora só no frontmatter.
- Revisão de prosa é julgamento sobre texto e regras escritas, não sobre comportamento em execução; o modelo caro fica onde o defeito é caro, em código e segurança. Por isso a decisão olha o ticket inteiro, nunca o delta, e o revisor de segurança não troca de modelo. O modelo só vai de Sonnet para o do frontmatter: uma correção pode acrescentar código, e se o ticket deixa de ser só prosa a rodada seguinte sobe revisor novo no frontmatter em vez de reusar o Sonnet. Revisor novo com delta pequeno (menos de 80 linhas, sem gatilho de segurança) roda em Sonnet.

## Skill de stack e ticket conjunto

- A skill de stack não é resumo, é o padrão obrigatório: implementar sem o padrão da stack é como implementar sem o ticket.
- Indisponível na sessão quer dizer, por exemplo, arquivo ausente ou plugin da skill desabilitado.
- Ticket conjunto: uma unidade a menos na leitura é padrão de stack inventado no diff.

## Por que o brief é inteiro

- O implementador não viu a conversa, o ticket nem a sua leitura: ele sabe o que o brief diz, e nada além.
- Commit e brief são seus: você responde pelo que entra na branch, mesmo quando o código é do implementador.
- Brief vago é a origem do retrabalho, e cada rodada de revisão perdida custa mais que um parágrafo a mais no brief.

## Os dois freios

- PR que o revisor não consegue separar entre ticket e reparo derruba o gate da Fase 5; por isso a correção maior que o ticket é pergunta, não commit.
- Se o humano disser para não corrigir agora, é ele quem decide se e quando isso vira ticket.

## Reuso, escopo e escoteiro

- Abstração nova sem segundo consumidor nomeado é achado IMPORTANT na Fase 5 e uma rodada de revisão a mais, e a rodada custa mais que a busca por reuso.
- Parâmetro ou ramo que nenhum cenário exercita não tem comportamento esperado conhecido; por isso não entra.
- Arquivo tocado sai no padrão do repositório e o intocado fica fora, para o PR não virar caçada ao legado.

## Armadilhas

- **Brief que presume a conversa.** O implementador não viu o ticket nem a sua leitura; "segue o padrão do módulo" sem caminho vira o padrão que ele inventar.
- **Dois implementadores no mesmo checkout.** A árvore é uma só: um sobrescreve o outro. Um por ticket, e você não edita enquanto ele roda.
- **Deixar o implementador commitar.** O commit é seu: é na 4.3 que o escopo do diff é conferido.
- **Abrir card no meio da execução.** Defeito encontrado é corrigido no mesmo PR e explicado em `Also fixed`; decisão que não é sua é pergunta na sessão. Issue nova só nasce pelo `/pipeline-ticket`, pedida pelo humano.
- **Corrigir fora do ticket sem registrar.** Arquivo extra sem item em `Also fixed` é desvio de escopo para o revisor e mistério para quem lê o PR depois.

## Os cinco itens do brief

Passos do passo 1 do 4.2 de `.claude/skills/pipeline-execute-ticket/SKILL.md`:

1. Escreva o brief inteiro: o implementador sabe o que ele diz e nada além (nunca "segue o padrão do módulo" sem caminho), com cada item do 4.1 resolvido, a resposta a um freio inclusive. Cinco itens: (1) **o ticket** inteiro, inline, com "Out", critérios e cenários; (2) **as leituras**: skill de stack, module map, arquivos de padrão; (3) **a abordagem**: onde entra, o que reusar (com caminho), o que não criar, armadilhas do module map; (4) **os arquivos** esperados e o que fica fora; (5) **o pronto**: `<gate.loop>` verde, module map atualizado, cada cenário coberto (teste com `gate.tests: true`; percorrido, com evidência, com `false`; o cenário com o marcador de `ticket.md` fica por conta da evidência).
