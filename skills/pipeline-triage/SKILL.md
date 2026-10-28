---
name: pipeline-triage
description: |
  Módulo de triagem de erros de produção — lê as issues do provedor de observabilidade, classifica, agrupa por causa e,
  com o OK do humano, abre os tickets pelo `/pipeline-ticket`; só leitura no provedor (Opus 5.5 xhigh)
  Use quando: "triagem do Sentry", "o que quebrou em produção", "olha os erros de produção", `/pipeline-triage <ID>`,
  ou quando o usuário passar um id de issue do provedor com intenção de entender ou corrigir o erro.
argument-hint: '[id da issue no provedor, opcional]'
model: claude-opus-5-5
effort: xhigh
---

Leia `.claude/skills/pipeline-triage-errors/SKILL.md` pelo caminho (ferramenta Read) e siga o checklist à risca — ele começa por
`pipeline-project-profile`, que se carrega pelo nome.

Issue pedida: $ARGUMENTS

Vazio: as issues não resolvidas do ambiente padrão na janela padrão de `.claude/pipeline/observability.md`. Mais de um
argumento, ou um que não casa o formato de id declarado ali: pare e mostre o formato.

O checklist da skill é o lembrete: nenhum passo se pula.
