---
name: pipeline-ticket
description: |
  Fase 1 — transforma uma demanda em tickets do GitHub prontos para agente (Opus 5.5 xhigh)
  Use quando: "quero criar um ticket", "preciso de tal feature", "monta o ticket disso", "abre as issues dessa demanda",
  ou quando o usuário descreve uma demanda com intenção de virar trabalho.
argument-hint: '[descrição da demanda]'
model: claude-opus-5-5
effort: xhigh
---

Leia `.claude/skills/pipeline-write-ticket/SKILL.md` pelo caminho (ferramenta Read) e siga o checklist à risca — ele começa por
`pipeline-project-profile`, que se carrega pelo nome.

Demanda do usuário: $ARGUMENTS

Se a demanda vier vazia, peça que ele descreva.

O checklist da skill é o lembrete: nenhum passo se pula.
