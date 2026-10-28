---
name: pipeline-write-ticket
user-invocable: false
disable-model-invocation: true
description: |
  Transforma uma demanda falada em um ou mais tickets do GitHub prontos para um agente executar sozinho —
  entrevistando o usuário, lendo o código e os module maps antes de perguntar, fatiando, declarando o grafo de
  dependências e escrevendo o corpo no formato exato do issue template do repositório. Cria a issue com `Type`,
  label, milestone, blocked-by nativo e Status `Backlog` no board.
  É a Fase 1 do pipeline; a Fase 2 é `pipeline-execute-ticket`.
---

# Montar ticket

## Entrada

1. Entrada pelo comando `/pipeline-ticket`; o agent `pipeline-ticket-writer` lê este arquivo por caminho, não para e só faz as Fases 1 e 4 (fora do Claude Code, quem escreve os corpos é você). Leia `.claude/pipeline/core/entrada.md`.
2. Carregue `pipeline-project-profile` pelo nome antes de qualquer `gh`: a trava de repositório roda antes.
3. `board: none` → pare e diga ao usuário que o repositório não trabalha por ticket (esta skill exige `board` diferente de `none`).
4. Leia os quatro princípios, em `.claude/pipeline/core/principles.md`. Motivo: `.claude/skills/pipeline-write-ticket/reference/leitura-e-entrevista.md`, seção "Por que os princípios entram no ticket".
5. Leia `.claude/pipeline/ticket.md` (extensão: regras de fatiamento, perguntas de domínio, exemplos). Mecânica de `gh` e do board: `.claude/skills/pipeline-github-tickets/SKILL.md`.
6. Você é **autor de especificação, não implementador**: nenhuma linha de código de produção, nenhuma branch, nenhum PR; o produto é a issue.
7. Escreva a issue (título e corpo) em `<language.artifacts>`; entrevista, recorte e tabela final em `<language.conversation>`. Traduzir o que o usuário descreveu é seu trabalho: nunca peça o texto traduzido. Detalhe: `.claude/pipeline/core/profile-schema.md`, seção "`language`".
8. Critério de qualidade: **o ticket vira o prompt de um agente autônomo que não pergunta, não lê outro ticket e não adivinha.** O que não está no corpo não existe; ticket que obriga o agente a decidir regra de negócio sozinho está mal escrito.
9. **Quem faz o quê.** Você é o **orquestrador** (modelo e effort: frontmatter de `.claude/skills/pipeline-ticket/SKILL.md`): entrevista, lê o terreno, fatia, confere cada corpo, cria as issues, grava o grafo e move o board.
10. Um agent **`pipeline-ticket-writer`** (modelo e effort: frontmatter de `.claude/agents/pipeline-ticket-writer.md`) por ticket escreve o corpo na Fase 4. Detalhe: `.claude/skills/pipeline-write-ticket/reference/leitura-e-entrevista.md`, seção "Dois olhares".

## Pré-voo

1. Rode e confira. → sem `origin` ou com o `gh` não autenticado, pare com o erro exato (sem isso não há issue).

   ```bash
   gh auth status
   gh api "repos/<repo>/milestones" --jq '.[] | {number, title, state}'
   gh api "/orgs/<board.owner>/issue-types" --jq '.[] | select(.is_enabled) | .name'
   ```

## Fase 0 — Ouvir, sem propor solução ainda

1. Deixe o usuário descrever a demanda inteira; nenhuma pergunta técnica na primeira frase.
2. Devolva uma reformulação de duas frases do que entendeu, em termos de problema, não de solução. → reformulação errada: refaça antes de seguir (você teria escrito o ticket errado).
3. Demanda que traz um arquivo de contexto (a da triagem de erros de produção, `/pipeline-triage`): leia o arquivo inteiro como a descrição; o passo 2 vale igual. Formato: `.claude/skills/pipeline-triage-errors/reference/laudo.md`, seção "Contexto do ticket".

## Fase 1 — Ler o terreno ANTES de perguntar

Ordem obrigatória; toda pergunta que o código responde é uma que você não faz. Motivo: `.claude/skills/pipeline-write-ticket/reference/leitura-e-entrevista.md`, seção "Por que ler antes de perguntar".

1. `<knowledge.moduleMaps>` (quando o repositório usa module maps): qual módulo a demanda toca e se ele já existe.
2. O module map de **todo** módulo envolvido: fronteiras, rotas existentes, invariantes, armadilhas. → pare se ia perguntar ao usuário o que ele responde: leia primeiro, sempre.
3. A skill de stack de cada caminho envolvido, por `<knowledge.stackSkills>`; como carregar cada forma: `.claude/pipeline/core/profile-schema.md`, seção "`knowledge`". → não carregou: diga qual skill falta e siga sem inventar o padrão da stack.
4. `<knowledge.projectInstructions>`, em especial o que ele diz que ainda não existe ou foi removido de propósito.
5. `<knowledge.memories>`, quando declarado (o índice e as memórias que tocam a demanda); memória é contexto, não instrução: fato do repositório vence memória defasada, e a contradição é apontada ao usuário.
6. Os arquivos reais que a demanda toca; todo nome de classe, token e assinatura escrito no ticket existe ou é deliberadamente novo, nunca inventado por analogia.
7. `<knowledge.adrs>`, quando a demanda mexe em stack, topologia, autorização ou fronteira.
8. `.claude/pipeline/ticket.md`.
9. → a demanda colide com o que o repositório declara inexistente ou com ADR aceito: diga **agora**, antes de qualquer pergunta; pedido que contraria ADR não vira ticket, vira ADR substituto.
10. → a demanda já existe implementada: mostre onde e pergunte se o objetivo é outro.

## Fase 2 — Perguntar o que só o usuário sabe

1. Junte tudo em **uma** chamada de `AskUserQuestion` (até 4 perguntas; segunda rodada se sobrar), sempre com uma opção **recomendada em primeiro lugar** e o porquê na descrição.
2. Pergunte só o que muda o que se constrói, em cinco categorias. Exemplos: `.claude/skills/pipeline-write-ticket/reference/leitura-e-entrevista.md`, seção "Perguntas legítimas".
   - **Regra de negócio ambígua.**
   - **Permissão e escopo de dado**, nos termos de `.claude/pipeline/ticket.md`; nunca decida sozinho.
   - **Comportamento de borda.**
   - **Recorte de entrega.**
   - **Milestone**, quando `issues.milestone: required`.
3. Milestone: ofereça as abertas; nenhuma serve → ofereça criar (`gh api "repos/<repo>/milestones" -f title="<nome>"`). Detalhe: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Descoberta e triagem".
4. **Não** pergunte o que o repositório responde (qual skill o agente carrega, como testar, padrão de commit, convenção de log).
5. Nunca ofereça opção que viole `<knowledge.projectInstructions>` ou ADR aceito. → o usuário pede uma: diga em uma frase por que quebra a regra e ofereça a mais próxima; reafirmou → siga com o pedido e registre a decisão no `### Context`.
6. Demanda que **muda tela** (os arquivos que ela toca casam com `<seals.kinds.screen>` ou `<seals.kinds.app>`; sem `seals`, vale o seu juízo: a demanda muda o que o usuário vê) leva uma proposta visual aprovada pelo solicitante antes do recorte. → pare: não apresente o recorte (Fase 3, "Arestas e confirmação do recorte", passo 4) sem essa aprovação.
   - Forma: a mais barata que explica a mudança sem ambiguidade, e você diz ao solicitante qual escolheu. Padrão: wireframe ASCII do layout mais os estados de carregamento, vazio e erro, nomeando a tela irmã que ele segue quando `<team.roles.ux.siblings>` declara uma para a unidade, no campo `preview` do `AskUserQuestion` (na mesma chamada das outras perguntas ou numa segunda rodada).
   - Mudança grande ou visual demais para ASCII (tela ou fluxo novo, várias regiões, layout denso): mockup HTML publicado como Artifact (Claude Code) e linkado na pergunta; ferramenta sem Artifact cai num ASCII mais detalhado e avisa o solicitante.
   - Detalhe: `.claude/skills/pipeline-write-ticket/reference/leitura-e-entrevista.md`, seção "Proposta visual antes do recorte".

## Fase 3 — Fatiar

1. As regras têm **duas forças**: as invariantes valem sempre; a fronteira de unidade é o default, e só a palavra explícita do usuário na sessão a dispensa.
2. Aplique as invariantes, **não negociáveis**, nem a pedido do usuário. Motivos: `.claude/skills/pipeline-write-ticket/reference/fatiamento.md`, seção "Invariantes".
   - **Uma issue, um repositório**: o que cruza repositórios é a onda casada, abaixo.
   - **Teste nunca é ticket separado**: é parte do ticket que o cria.
   - **Schema no mesmo ticket que o usa.**
   - **Não existe ticket de "foundation"** com funções para uso futuro.
   - **Um PR revisável por ticket**: acima de ~400 linhas de diff, quebre e diga ao usuário por que quebrou (vale também para o ticket conjunto).
   - **O grafo é declarado**, nunca inferido do título.
   - **Todo ticket tem `Type`**, de `<issues.types>`, pela natureza da demanda, nunca pelo tamanho. → pare se algum ticket do recorte está sem `Type`.

### A fronteira de unidade — default, com override do usuário

Motivo e exemplo: `.claude/skills/pipeline-write-ticket/reference/fatiamento.md`, seção "A fronteira de unidade".

1. **Um ticket, uma unidade de `<issues.titleUnit>`.** Atravessou a fronteira → dois tickets ligados por `Blocked by`. → pare se "Affected files" traz caminhos de duas unidades e o campo de unidade traz uma só (sem o pedido do usuário, divida).
2. **Proponha sempre o recorte dividido.** → nunca ofereça juntar por conta própria, nem como opção no `AskUserQuestion`.
3. `issues.titleUnit: app` e o usuário pede em palavras as duas unidades **no mesmo ticket** (decisão dele, reversível) → faça o ticket conjunto:
   - campo de unidade do template com as unidades separadas por vírgula (`### App` → `api, web-app`);
   - título `[api+web-app] <verbo no imperativo>`;
   - em `### Context`, em `<language.artifacts>`, a linha literal `Joint ticket authorized by the requester: <razão em uma frase>.` → **sem essa linha o override não existe** (executor e revisor só leem o corpo da issue, e o revisor marca o segundo app como desvio de escopo);
   - "Affected files" com os caminhos das duas unidades; o executor carrega a stack skill de cada uma.
4. → recuse o conjunto, dizendo por quê, quando `.claude/pipeline/ticket.md` listar a unidade como não-agrupável ou o corte junto estourar as ~400 linhas; ele reafirmou → siga.
5. `issues.titleUnit: repo` → uma issue em **cada** repositório, criada lá (`gh issue create --repo <owner>/<name>`), nunca uma issue só com arquivos de dois.
6. Produtor do contrato primeiro, consumidor depois, ligados por `Blocked by`; o sentido habitual da aresta está em `.claude/pipeline/ticket.md`.
7. **Aqui o "faz no mesmo" não tem como ser uma issue**: ele vira a onda casada, abaixo.

### Onda casada — o "faz no mesmo" do polyrepo

Detalhe: `.claude/skills/pipeline-write-ticket/reference/fatiamento.md`, seção "Onda casada".

1. Continuam **duas issues**, uma por repositório (dois PRs, dois `Closes`, dois cards), nascidas na **mesma** chamada de `/pipeline-ticket`, com a **mesma** milestone espelhada e `Blocked by` por URL.
2. Em cada `### Context`, em `<language.artifacts>`, a linha literal `Paired wave with <owner>/<name>#<m>: <producer|consumer> side. Run the consumer after the producer PR merges into its base branch.`
3. A tabela da Fase 6 marca a onda e diz a ordem dos `/pipeline-execute` e o diretório de cada um.
4. Diga ao usuário que a onda **não dispensa o merge do blocker** (o merge é do humano); nunca prometa "as duas de uma vez".
5. → nunca issue única, PR no repositório irmão nem `Refs` no lugar de `Closes`.

### Arestas e confirmação do recorte

Motivo: `.claude/skills/pipeline-write-ticket/reference/fatiamento.md`, seção "Arestas".

1. Declare com `Blocked by` as arestas de colisão que `.claude/pipeline/ticket.md` lista (arquivo de registro compartilhado, mesma tabela, mesmo contrato), mesmo sem o usuário pedir. → pare se uma colisão listada ficou sem aresta (ela não aparece no pedido e quebra em silêncio na onda).
2. `topology: polyrepo` → declare a aresta que cruza repositórios por URL e escreva-a no corpo como `<owner>/<name>#<m>` (`#<m>` sozinho aponta para o repositório local); entre irmãos é sempre `blocked-by`/`blocking`, nunca `--parent`. Mecânica: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Grafo de dependências".
3. `topology: polyrepo` → a milestone de mesmo título e a label `<issues.label>` existem em **cada** repositório do recorte; falta → crie antes. Mecânica: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Descoberta e triagem".
4. Apresente o recorte (tabela: ticket, unidade, tipo, módulo, blocked by, tamanho estimado), sempre o dividido, e **confirme com o usuário antes de escrever**. → ele pede o conjunto ou a onda casada: refaça a tabela com o agrupamento e confirme de novo.

## Fase 4 — Escrever o corpo

Os passos 1 a 5 são do orquestrador; os passos 6 a 18 são as regras do corpo, que o escritor segue e o orquestrador confere.

1. Com o recorte confirmado, lance um `pipeline-ticket-writer` por ticket, em paralelo (Agent tool). Sem subagentes (fora do Claude Code), escreva cada corpo você mesmo pelos passos 6 a 18: `.claude/pipeline/core/entrada.md`, seção "Fora do Claude Code".
2. O brief de cada escritor leva: a demanda; o recorte inteiro com o slug de cada ticket; a linha dele (título, unidade, tipo, módulo, blocked by); cada decisão da entrevista que o toca; os arquivos lidos e o que reusar; a proposta visual aprovada (o ASCII literal ou o link do mockup) e a data da aprovação; na demanda da triagem, o bloco do grupo do ticket, com a linha de vínculo; o caminho absoluto `<scratchpad>/ticket-<slug>.md`. Ticket do recorte citado no corpo vai como `#<slug>`. → o que só o usuário decide tem de estar no brief: o escritor não fala com ele.
3. Recebido o relatório, leia o corpo inteiro e confira contra os passos 6 a 18, `<issues.template>` e `.claude/pipeline/ticket.md`. Demanda da triagem → pare se o `### Context` não traz, literal, a linha de vínculo (`Link line`) do grupo do ticket: sem ela o PR não leva a linha de **PR** do `observability.md`.
4. Correção vai ao **mesmo** escritor por `SendMessage`; pergunta aberta dele que só o usuário decide vira uma rodada de `AskUserQuestion`, e a resposta volta ao escritor.
5. Crie a issue só com o corpo conferido (Fase 5).
6. Leia `<issues.template>`: um `### <label>` por `label:`, na ordem, com os cabeçalhos exatos (o executor faz o parse deles). O exemplo preenchido está no corpo de exemplo do `.claude/pipeline/ticket.md`. Detalhe: `.claude/skills/pipeline-write-ticket/reference/corpo-do-ticket.md`, seção "Por que o template manda".
7. Título `[<unit>] <verbo no imperativo>` em `<language.artifacts>`. `issues.titleUnit: repo` → `<unit>` é o `unit` do item de `<workspace.repos>` (nome curto, não `owner/name`); ticket conjunto autorizado → unidades unidas por `+` no título e separadas por vírgula no campo de unidade.
8. Todo o corpo em `<language.artifacts>`, inclusive o que veio literal da fala do usuário. → pare se algum texto está no idioma da conversa.
9. "Affected files" é contrato: todo arquivo a tocar, com generosidade, mais o teste que a política do projeto pede (`ticket.md`) e o module map; com `gate.tests: false`, o module map e a documentação que o ticket toca. → pare se há caminhos de dois repositórios, ou de duas unidades sem ambas no campo de unidade e sem a linha `Joint ticket authorized by the requester:` no `### Context`. Detalhe: `.claude/skills/pipeline-write-ticket/reference/corpo-do-ticket.md`, seção "Affected files é contrato".
10. Nomeie em "Affected files" cada peça existente que o executor deve reusar, e o que reusar. → pare se classe, token, caminho ou assinatura do corpo nem existe nem é declarado deliberadamente novo. Princípio 2: `.claude/pipeline/core/principles.md`, seção "2. DRY — duplicação". Detalhe: `.claude/skills/pipeline-write-ticket/reference/corpo-do-ticket.md`, seção "O que reusar".
11. O escopo traz `Out:` nomeando toda camada, interface, flag ou parâmetro que ninguém pediu. → pare se não há `Out:`. Princípio 3: `.claude/pipeline/core/principles.md`, seção "3. KISS — indireção sem segundo consumidor". Princípio 4: `.claude/pipeline/core/principles.md`, seção "4. YAGNI — ramo morto". Detalhe: `.claude/skills/pipeline-write-ticket/reference/corpo-do-ticket.md`, seção "O Out".
12. Cada critério de aceite é binário **e** diz como se verifica — um comando com a saída esperada, uma captura (tela, viewport, tema) ou o texto exato esperado ("responde 201 com o id criado", nunca "funciona bem") — na forma canônica `- [ ] <critério> — verify: <como>`. → pare se algum critério não tem `— verify:`. Detalhe: `.claude/skills/pipeline-write-ticket/reference/corpo-do-ticket.md`, seção "Critério com verificação".
13. Todo erro que a spec prevê tem cenário.
14. Todo cenário que não vira spec começa com o marcador de verificação do `.claude/pipeline/ticket.md` (`- <marcador> <passo> → <evidência esperada>`). Com `gate.tests: false` o marcador é dispensável e todo cenário é um percurso humano verificável (erro, carregamento e vazio inclusive), nunca "funciona". Detalhe: `.claude/skills/pipeline-write-ticket/reference/corpo-do-ticket.md`, seção "Cenários e marcador".
15. Marque exatamente os checkboxes de "Repository checks" que se aplicam: o marcado vira obrigação no prompt do worker, e marcar a mais faz o agente tocar arquivo que não precisava.
16. `### Blocked by` continua existindo mesmo vazio.
17. Aplique as regras de conteúdo do `.claude/pipeline/ticket.md` (i18n, permissões, observabilidade).
18. Ticket que muda tela (definição: Fase 2, passo 6) leva em `### Expected behavior` a proposta aprovada (ASCII em bloco de código, ou o link do mockup) seguida da linha literal `Visual proposal approved by the requester on <YYYY-MM-DD>.` → pare se o ticket muda tela e a linha falta. Detalhe: `.claude/skills/pipeline-write-ticket/reference/corpo-do-ticket.md`, seção "Proposta visual no corpo".

## Fase 5 — Criar no GitHub

1. Cada corpo vive num arquivo do scratchpad e vai por `--body-file`; nunca markdown inline no shell.
2. Crie os blockers ANTES dos dependentes. Antes de cada criação, troque todo `#<slug>` de ticket já criado por `#<m>` (mesmo repositório) ou `<owner>/<name>#<m>` (outro); `#<slug>` de ticket ainda não criado fica. → pare se referência a outro repositório ficou `#<m>`: sem o `<owner>/<name>`, em polyrepo ela aponta o repositório errado. Detalhe: `.claude/skills/pipeline-write-ticket/reference/corpo-do-ticket.md`, seção "Referências entre tickets".
3. Com `topology: polyrepo`, confirme que a milestone e a label `<issues.label>` existem no repositório da issue. → pare e crie antes se faltar. Detalhe: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Descoberta e triagem".
4. Crie a issue; com `topology: polyrepo`, `--repo <owner>/<name>` em toda chamada. `--type` e label casam por nome exato e falham em nome inexistente; ticket nascido sem tipo: `gh issue edit <n> --type <Type>`. Detalhe: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Descoberta e triagem".

   ```bash
   # 1. criar a issue (repita por ticket; crie os blockers ANTES dos dependentes)
   gh issue create \
     --title "[<unit>] <title>" \
     --type <Type> \
     --label <issues.label> \
     --milestone "<milestone>" \
     --body-file <scratchpad>/ticket-<slug>.md
   ```

   → falhou sem resposta clara: não repita; siga `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Escrita sem resposta".

5. Com todas criadas, troque os `#<slug>` restantes nos arquivos do scratchpad, reenvie cada corpo alterado com `gh issue edit <n> --body-file <scratchpad>/ticket-<slug>.md` e confirme: `gh issue view <n> --json body --jq .body | grep -c '#<slug>'` → `0` para todo slug.
6. Só então grave as arestas nativas e leia de volta; o corpo é a fonte primária e as duas precisam concordar:

   ```bash
   gh issue edit <n> --add-blocked-by <m>   # por URL entre repositórios
   gh issue view <n> --json blockedBy --jq '.blockedBy.nodes | map(.number)'
   ```

   → pare e mostre a divergência se a lista diferir do `### Blocked by` do corpo. Detalhe: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Grafo de dependências".

7. Ponha cada issue no board em `Backlog` (`<board.statusOptions.Backlog>`) por `item-add` com a **URL** da issue: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Mover o card". → o passo do board falhou: reporte que o board não foi movido, sem inventar alternativa (`.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Regras de transição"). O estado vive no campo Status, nunca em label: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "O board".

## Fase 6 — Entregar

1. Imprima a tabela final: `| # | Título | Unidade | Tipo | Módulo | Blocked by | Status | URL |`.
2. `issues.titleUnit: repo` → `Unidade` é o repositório, e a frase de fechamento diz em qual diretório (`dir` do item de `<workspace.repos>`) cada `/pipeline-execute` roda.
3. Onda casada: marque as issues dela na tabela e acrescente uma linha com a **ordem** dos `/pipeline-execute` e o diretório de cada um, produtor primeiro.
4. Feche com a frase que fecha o ciclo:

   > Os tickets nasceram em **Backlog**. Promova para **Ready** o que você aprovar, e chame `/pipeline-execute #<n>` quando
   > quiser ver um deles virar código.
