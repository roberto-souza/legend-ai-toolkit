# Laudo da revisão

## Formato

```markdown
## Verdict

APPROVED

Reviewed head: <full 40-char sha from `git rev-parse HEAD`; read by `pipeline-gate.mjs`>

## Summary

Ticket #<n>, round <r>. <2 sentences: what the diff does and the overall state.>
Range: <range reviewed>
Gate: GREEN | RED (<what broke>) | SKIPPED (historical range)
Previous findings: <"none" in round 1, or one "<title> — FIXED | NOT FIXED" per line; a NOT FIXED finding is also listed again under Findings with its severity>
Files in the diff outside "Affected files" and not covered by "Also fixed": <list or "none">

## Acceptance criteria

- [x] <criterion> — verify: <method> → <evidence: command output, file:line or test name>
- [ ] <criterion> — NOT MET: <why>
- [x] <criterion> — not touched by the delta (round 2+ and post-PR correction only)

## Findings

### [BLOCKER] <one-line title>

- File: <path>:<line>
- Problem: <what is wrong>
- Why it matters: <the concrete consequence — leaked data, bypassed rule, runtime error>
- Failure scenario: <concrete input or state> → <wrong result> (required for BLOCKER and IMPORTANT; NIT may omit)
- Rule violated: <rules.md entry / project instructions / ADR / stack skill / acceptance criterion — or "correctness">
- Suggested fix: <what to do, without writing the code for them>

### [IMPORTANT] ...

### [NIT] ...
```

## Quem lê o laudo

- O formato é literal porque o laudo é lido por máquina: `pipeline-gate.mjs` toma a primeira linha não vazia sob `## Verdict` como o veredito e a linha `Reviewed head:` (40 caracteres hexadecimais) como o SHA revisado, e recusa o selo de revisão quando qualquer um dos dois não casa.
- A triagem de quem orquestra lê o arquivo, não a saída do agente.
- O laudo do "Modo diff" de `pipeline-security-audit` espelha este formato, para o laço de triagem não mudar.

## Severidade

| Severidade | O que é |
| --- | --- |
| **BLOCKER** | Correção, segurança, integridade de dado, regressão, regra de `rules.md` declarada BLOCKER, princípio do core no caso BLOCKER dele (capacidade listada no "Out" entregue), ADR violado, critério de aceite não atendido, gate vermelho, secret |
| **IMPORTANT** | Teste faltando que a política de testes do projeto exige para um ramo real (só com `gate.tests: true`), cenário da spec sem caminho identificável no código, caminho de erro ou de carregamento faltando na tela, desvio de escopo, module map/doc desatualizado, regra de `rules.md` declarada IMPORTANT, princípio do core sem outra severidade declarada, incerteza a verificar |
| **NIT** | Nome, legibilidade, regra de `rules.md` declarada NIT — só quando o ganho é real e cabe no escopo do ticket |
