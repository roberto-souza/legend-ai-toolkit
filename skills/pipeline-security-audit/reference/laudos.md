# Laudos de segurança

## Modo diff

O laudo espelha o do `pipeline-review-diff`, para o laço de triagem do executor não mudar:

```markdown
## Verdict

APPROVED

## Summary

Ticket #<n>, round <r>. <2 sentences: what surface the diff touches and the overall state.>
Range: <range reviewed>
Baseline suppressions: <"none" or one "matches baseline: <risk>" per line>
Previous findings: <"none" in round 1, or one "<title> — FIXED | NOT FIXED" per line; a NOT FIXED finding is also listed again under Findings with its severity>

## Findings

### [BLOCKER] <one-line title>

- File: <path>:<line>
- Attacker: <profile and what they control>
- Steps: <numbered, reproducible sequence, each step anchored to file:line>
- Impact: <what leaks, what rule is bypassed, what integrity breaks>
- Suggested fix: <what to do, without writing the code for them>

### [IMPORTANT] <one-line title>

- File: ...
- Attacker: ...
- Steps: ...
- Impact: ...
- Depends on: <the other named defect or the plausible near change>
- Suggested fix: ...
```

## Modo axis

O mesmo bloco de achado do modo diff, **sem** `## Verdict`, com `## Axis`, `## Findings` e `## Baseline suppressions`.

## Modo sweep

**Sem veredito.** Uma varredura da superfície inteira que pudesse bloquear congelaria o pipeline e seria desligada.

```markdown
## Sweep

Date: <YYYY-MM-DD>
Axes covered: <list>
Baseline suppressions: <one "matches baseline: <risk>" per line, or "none">

## Findings

### [BLOCKER] <one-line title>

- Suggested ticket title: <[unit] imperative title, in the artifacts language>
- Axis: <axis>
- File: <path>:<line>
- Attacker: ...
- Steps: ...
- Impact: ...
- Suggested fix: ...

## Proposed baseline entries

<A risk the code itself already declares deliberate (a header comment or an ADR says so) but the baseline does not
list. One entry in the baseline format of section 6. "None." otherwise. A real finding never moves here.>
```

## Entrada do baseline

```markdown
### <risk, one line>

- Why accepted: <the reasoning, not a hand-wave>
- Date: <YYYY-MM-DD>
- Rationale lives in: <code comment or ADR pointer>
```
