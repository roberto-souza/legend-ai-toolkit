# Observabilidade deste repositório

Lido pelo módulo de triagem de erros de produção (`/pipeline-triage`) e, no PR, pelo `pipeline-execute-ticket`; existe só com `observability:` no profile. Extensão acrescenta regra, nunca remove gate do core: a triagem só lê o provedor, e o dado pessoal fica fora do laudo e do ticket, declare-se o que se declarar aqui.

## Provedor

- **Organização:** <slug da organização no provedor>.
- **Projetos:** <slug de cada projeto no provedor, separados por vírgula>.
- **Servidor MCP:** <nome do servidor em `mcpServers` do `.mcp.json` deste repositório>.

## Triagem

- **Ambiente:** <ambiente padrão, como `production`>.
- **Janela:** <janela padrão quando o comando vem sem argumento, como `72h`>.
- **Tags:** <tags do evento que a triagem lê, separadas por vírgula>.

## Vínculo

- **Id:** <formato do id curto de cada projeto, com `{n}` no lugar do sufixo (letras maiúsculas e dígitos no Sentry, como `PROJETO-4Z`), como `PROJETO-{n}`; separados por vírgula>.
- **Issue:** <linha literal que vai no `### Context` do ticket, com `{id}` no lugar do id, como `Sentry issue: {id}`>.
- **PR:** <linha literal que vai no corpo do PR, com `{id}` no lugar do id, como `Fixes {id}`>.

## Dado pessoal

- **Regra:** <o que, além de ids, contagens e valores técnicos, nunca entra no laudo nem no ticket neste repositório; `só ids` quando não há o que acrescentar>.
