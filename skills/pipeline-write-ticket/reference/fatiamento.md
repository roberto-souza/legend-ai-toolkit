# Fatiamento

Motivos, exemplos e a explicação longa da onda casada para `## Fase 3 — Fatiar` de `.claude/skills/pipeline-write-ticket/SKILL.md`. Nenhuma ação mora aqui: os passos estão no arquivo principal.

## Invariantes

- **Uma issue, um repositório.** Branch, PR, checks, milestone, label e `Closes` são todos por repositório; não existe issue que atravessa repositórios.
- **Um PR revisável por ticket.** O teto de ~400 linhas é o que impede o override do ticket conjunto de virar ticket-monstro.
- **Todo ticket tem `Type`.** Ele sai da natureza da demanda, nunca do tamanho, e é de onde o `pipeline-execute-ticket` tira o prefixo da branch.
- As duas forças importam: as invariantes não cedem nem a pedido; a fronteira de unidade é default e cede à palavra explícita do usuário.
- Armadilha: ticket sem `Type`. O board perde o rastro, e o `pipeline-execute-ticket` fica sem de onde tirar o prefixo da branch.

## A fronteira de unidade

- Um worker carrega uma skill de stack e um module map; ticket que atravessa a unidade vira onda de largura 1 e desperdiça o paralelismo.
- É esse custo que sustenta o recorte dividido como proposta padrão.
- Com `issues.titleUnit: app` a fronteira é convenção: um repositório, uma branch, um PR. Se o usuário pede em palavras as duas unidades no mesmo ticket, faz-se: é decisão dele e é reversível. Exemplo de título: `[api+web-app] <verbo no imperativo>`, com `api, web-app` no campo de unidade.
- A linha de autorização no `### Context` é o que faz o override existir: o executor e o revisor só leem o corpo da issue, nunca a conversa, e sem a linha o revisor marca o segundo app como desvio de escopo.
- Unidade não-agrupável (tipicamente a compartilhada por vários consumidores): juntar esconde o blast radius.
- Com `issues.titleUnit: repo` a fronteira é física, não convenção.
- Armadilha: ticket atravessando unidade sem o usuário ter pedido. O sintoma é "Affected files" com caminhos de duas unidades juntos e o campo de unidade com uma só. Divide. Com o pedido dele, o campo de unidade traz as duas e o `### Context` traz a autorização.
- Armadilha: oferecer o ticket conjunto. Você nunca propõe juntar. Propõe dividido e junta quando ele mandar.
- Armadilha: override que vive só na conversa. Sem a linha de autorização no `### Context`, o revisor reprova por desvio de escopo e a rodada se perde.

## Onda casada

- É o pedido do usuário para tratar como uma coisa só uma demanda que cruza repositórios. Continuam duas issues, com dois PRs, dois `Closes` e dois cards; muda a coordenação.
- Ela não dispensa o merge do blocker: o `pipeline-execute-ticket` para em `blockedBy` aberto e, no polyrepo, exige o PR do blocker mergeado na base do repositório dele, o que impede o cliente de ser implementado contra um endpoint que ainda não existe. O merge é do humano.
- O que a onda compra é você não ter de descobrir nem pilotar a ordem: ela vem escrita, e o executor do produtor fecha dizendo qual é a próxima issue e em qual diretório. Prometer "as duas de uma vez" seria mentira.
- Issue única, PR no repositório irmão ou `Refs` no lugar de `Closes` não servem: o pipeline não escreve em repositório irmão, e PR sem ticket local fica sem revisão.

## Arestas

- Colisão de semântica não aparece no merge: o merge passa limpo e o resultado fica silenciosamente errado. Por isso as arestas de colisão são declaradas mesmo sem pedido.
- A aresta que cruza repositórios é a mais cara de descobrir tarde e a que o usuário nunca pede.
- No corpo ela se escreve `<owner>/<name>#<m>`: `#<m>` sozinho aponta para o repositório local e vira link errado.
- A mecânica da aresta está em `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Grafo de dependências".
- Armadilha: esquecer uma aresta de colisão. Não aparece no pedido do usuário e quebra silenciosamente na onda.
- Armadilha: milestone que existe só num dos repositórios. A onda é espelhada; crie em cada um antes de criar as issues.
