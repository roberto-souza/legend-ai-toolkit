---
name: pipeline-security
description: |
  Varredura de segurança da superfície inteira, com prova de exploração — não bloqueia nada
  Use quando: o humano pediu uma varredura de segurança.
argument-hint: '[eixos, opcional]'
model: claude-opus-5-5
effort: medium
---

Carregue e siga a skill `pipeline-security-audit` à risca, em **modo sweep** — ela começa por `pipeline-project-profile`.

Eixos pedidos: $ARGUMENTS

Vazio: todos os eixos de `.claude/pipeline/security.md`. Nome que não casa com nenhum eixo: pare e liste os eixos que
existem.

O checklist da skill é o lembrete: nenhum passo se pula.
