---
name: pipeline-execute
description: |
  Executa um ou mais tickets já existentes no checkout local, empilhando os PRs
  Use quando: `/pipeline-execute #26`, `/pipeline-execute #26 #27 #28`, "roda o #26", "implementa esses tickets nessa ordem",
  ou quando o usuário passar número de issue com intenção de ver o código pronto agora.
argument-hint: '#26 [#27 #28 ...] [--impl sonnet|opus|fable|haiku]'
model: claude-opus-5-5
effort: medium
---

Leia `.claude/skills/pipeline-execute-ticket/SKILL.md` pelo caminho (ferramenta Read) e siga o checklist à risca — ele começa por
`pipeline-project-profile`, que se carrega pelo nome.

Tickets: $ARGUMENTS

Se nenhum número de issue vier, pergunte qual é. Não adivinhe pela branch atual nem pelo diff.

O checklist da skill é o lembrete: nenhum passo se pula.
