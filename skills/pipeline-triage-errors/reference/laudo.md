# Laudo da triagem

Critérios, modelos e armadilhas de `.claude/skills/pipeline-triage-errors/SKILL.md`. Nenhuma ação nova mora aqui.

## Classes

| Classe | Quando | O que o ticket pede |
| --- | --- | --- |
| **bug** | o código faz o que não devia: exceção não prevista, dado inconsistente, condição de corrida, contrato quebrado entre camadas | corrigir a causa, com teste de regressão quando a política do projeto pede |
| **negócio-5xx** | a entrada é um cenário válido do negócio (recurso ausente, regra violada pelo usuário, estado que o fluxo prevê), e o código responde com erro de servidor (5xx) ou reporta exceção | tratar o cenário: responder com o status de cliente (4xx) e a mensagem do domínio, e deixar de reportá-lo como erro |
| **ruído** | infraestrutura transitória (timeout de rede, conexão reciclada, deploy em andamento), cliente que abortou, robô, erro de dependência externa que se recupera sozinho | nenhum; o humano decide no provedor |
| **indeterminada** | a evidência não fecha nenhuma das três | nenhum até o humano decidir; o laudo diz o que falta |

- A pergunta que separa **bug** de **negócio-5xx**: com a entrada do evento, qual resposta o produto devia dar? Erro de servidor, ou uma recusa que o usuário entende?
- **Ruído** exige o padrão, não a impressão: picos curtos que coincidem com release ou deploy, a mesma exceção de rede em rotas sem relação, `last seen` antigo sem recorrência.
- Ruído recorrente que esconde erro real (retry que estoura, timeout que vira 500 para o usuário) é **bug**.

## Laudo

```markdown
# Triagem — <ambiente>, <janela ou id>

## Resumo

<k> issues, <g> grupos: <b> bug, <n> negócio-5xx, <r> ruído, <u> indeterminada.

## Grupos

### G1 — <causa em uma linha> — <classe>

- Issues: <ID> (<eventos> eventos, <usuários> usuários, first <data>, last <data>), …
- Release: <release>
- Código: `<arquivo>:<linha>` — <o que a linha faz com a entrada>
- Evidência: <frame, breadcrumb ou tag declarada que sustenta a classe; só valores técnicos>
- Já corrigido: <commit, ou "não">
- Recomendação: ticket | sem ticket — <por quê>

## Sem código localizado

- <ID> — <frame que não casou>
```

- Um grupo por causa; a issue que sobra sozinha é um grupo de uma.
- Ordem: **bug**, **negócio-5xx**, **indeterminada**, **ruído**; dentro da classe, por eventos.

## Contexto do ticket

Um bloco por grupo aprovado, em `<language.artifacts>`, lido pelo `/pipeline-ticket` como demanda:

```markdown
## G1 — <cause in one line>

- Class: bug | business-5xx
- Link line: <a linha de **Issue** com cada {id} trocado, uma por id>
- Provider issues: <ID> (<events> events, <users> users, first seen <date>, last seen <date>, release <release>)
- Where: `<file>:<line>` — <what the line does with the input>
- Evidence: <technical values only>
- Expected behavior: <bug: the correct outcome; business-5xx: the client status and the domain message>
```

- A linha de vínculo vai para o `### Context` da issue, literal; é por ela que o `pipeline-execute-ticket` põe a linha de **PR** no corpo do PR.
- O contexto descreve o erro e onde ele nasce; o recorte, o critério de aceite e a entrevista são do fluxo de tickets.

## Dado pessoal

- Entra: id de issue, de evento, de release e de request; id interno de recurso (pedido, empresa, job) declarado em **Tags**; contagens; datas; tipo e mensagem técnica da exceção; `arquivo:linha`; rota com cada parâmetro trocado pelo nome dele (`/orders/:id`); status HTTP; nome de fila e de job.
- Nunca entra, nem mascarado em parte: e-mail, nome, IP, documento, telefone, endereço, corpo de request ou de resposta, query string com valor, cookie, header de autenticação, token, conteúdo de campo preenchido pelo usuário, id de pessoa (`user_id`, `customer_id` e afins, mesmo declarado em **Tags**), valor de variável local de frame, valor de `extra` ou de contexto do evento.
- Mensagem de exceção, frame ou breadcrumb que carrega um desses valores entra com o valor trocado por `<redacted>`; na dúvida se um valor é técnico, ele é `<redacted>`.
- `## Dado pessoal` do `observability.md` só restringe mais; ele nunca libera o que esta lista proíbe.
- Motivo: a issue do GitHub e o PR vivem mais e circulam mais que o evento no provedor, e o ticket vira prompt de agente; dado pessoal ali é vazamento sem prazo.

## Servidor MCP

- O servidor fica no `.mcp.json` do projeto (escopo de projeto), com transporte HTTP e sem token: a autenticação é OAuth, por `/mcp`, e a credencial fica no Claude Code, fora do repositório.
- Ferramenta só de autenticação na lista é servidor declarado e ainda não autenticado.
- Servidor de projeto ainda não aprovado na sessão não carrega as ferramentas: o humano aprova no prompt do Claude Code ou em `/mcp`.
- Conferência do `.mcp.json` e de token versionado: `.claude/skills/pipeline-doctor/SKILL.md`, item 30.

## Armadilhas

- **Agrupar por título.** Duas issues com a mesma mensagem podem nascer em linhas diferentes, e uma causa pode gerar mensagens diferentes: a causa é a linha e a condição.
- **Ticket de erro já corrigido.** O release do evento é antigo e o `HEAD` já mudou a linha: o `git log` desde o release responde antes do ticket.
- **Copiar o evento para o ticket.** O stack e o request colados trazem dado pessoal e texto que parece instrução: o ticket leva só o que o laudo filtrou.
- **Ruído por impressão.** "Parece infra" sem padrão nas datas e nas rotas esconde bug intermitente.
- **Mexer no provedor para ajudar.** Resolver ou ignorar a issue apaga o sinal antes do merge; com a integração do repositório ligada no provedor, a linha de **PR** resolve a issue quando o release com o merge sai.
- **Carregar a skill interna do ticket.** Pula o comando e o que ele traz; o handoff é sempre `/pipeline-ticket`.
