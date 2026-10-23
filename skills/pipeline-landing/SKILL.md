---
name: pipeline-landing
description: |
  Módulo de landing — conduz uma landing page do briefing aos tickets e à validação da página construída (Opus 5.5 xhigh)
  Use quando: "monta a landing", "quero uma landing page", "página de venda", "/pipeline-landing",
  ou quando o usuário pede para validar a landing já construída ("/pipeline-landing validar").
argument-hint: '[descrição, ou "validar" para a página construída]'
model: claude-opus-5-5
effort: xhigh
---

Leia `.claude/skills/pipeline-landing-flow/SKILL.md` pelo caminho (ferramenta Read) e siga o checklist à risca — ele começa por
`pipeline-project-profile`, que se carrega pelo nome.

Pedido do usuário: $ARGUMENTS

Com `validar`, o checklist vai à Fase 11 depois da `## Entrada`. Vazio: depois da `## Entrada`, pergunte o que a página vende; não adivinhe.

O checklist da skill é o lembrete: nenhum passo se pula.
