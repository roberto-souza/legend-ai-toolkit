# Descoberta e triagem

Motivos dos passos de `.claude/skills/pipeline-github-tickets/SKILL.md`, seções "Descoberta e triagem" e "`Type`". Nenhuma ação nova mora aqui.

## Da org e do repositório

- `Type` é da org; label e milestone são do repositório.
- Com `topology: polyrepo` os tipos valem igual em todos os irmãos, mas `<issues.label>` precisa existir em cada repositório onde se cria issue.
- A milestone é um objeto por repositório: a mesma onda existe como milestone de mesmo título em cada um.

## Como escolher o Type

O campo nativo dá ao board o rastro do que é correção e do que é capacidade nova. Ele sai da natureza da demanda, nunca do tamanho: comportamento errado que já existe, capacidade nova, ou trabalho sem mudança de comportamento (refactor, doc, tooling, infra).
