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

No eixo `supply-chain`, o laudo parcial tem `## Axis`, `## Findings` com `None.` (o eixo só roda as cinco verificações), `## Supply chain` no formato da seção "Bloco Supply chain", sem `Suggested ticket title`, e `## Baseline suppressions`.

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

## Supply chain

<Only when the supply-chain axis ran: the partial report's Commands line and its items, in the format of the "Bloco
Supply chain" section, with Suggested ticket title, ranked by severity; the same item from two reports appears once;
"None." without items. Without the axis, this section does not exist.>

## Proposed baseline entries

<A risk the code itself already declares deliberate (a header comment or an ADR says so) but the baseline does not
list. One entry in the baseline format of section 6. "None." otherwise. A real finding never moves here.>
```

## Bloco Supply chain

Bloco do eixo `supply-chain`, depois de `## Findings`, nos modos axis e sweep. Item de supply-chain **nunca** entra em `## Findings` e não usa Attacker, Steps e Impact.

```markdown
## Supply chain

Commands: <each command run, with its exit code; "not run: <check> — <reason>" when the output has no readable advisory list>

### [BLOCKER] <one-line title>

- Suggested ticket title: <[unit] imperative title, in the artifacts language>
- Check: <dependency-advisory | runtime-version | image-pin | override | unmaintained>
- Evidence: <command> → <output excerpt>
- Reach: <prod | dev | runtime image | build>
- Fix: <stable version or action; "no stable fix" when none>
```

- Sem item, a seção fica com `None.` depois de `Commands:`.
- `Suggested ticket title` só aparece no sweep, como em `## Findings`.
- Os ids de aviso, as versões e as datas saem da saída do comando citado em `Evidence`, nunca da memória do modelo.

### Alcance do item

- `dependency-advisory`: `prod` quando o pacote aparece no recorte de produção da Auditoria; senão `dev`.
- `runtime-version`: `build`.
- `image-pin`: `runtime image` para a imagem que roda a aplicação; `build` para imagem só de build ou de CI.
- `override` e `unmaintained`: o alcance do pacote, `prod` ou `dev`, pela mesma regra de `dependency-advisory`.

### Severidade do item

- **BLOCKER**: aviso crítico ou alto com correção estável, em pacote de `Reach: prod` ou na imagem de runtime; e `runtime-version` que quebra build ou deploy (a Guarda falha ou um mínimo declarado não é satisfeito), com `Reach: build`.
- **IMPORTANT**: todo o resto, inclusive aviso sem correção estável (`Fix: no stable fix`).
- Pacote com vários avisos é um item só, com a maior severidade entre eles.
- Não existe NIT, como no resto do laudo.

### Baseline

- Item cujo risco casa com uma entrada do baseline não entra: vira `matches baseline: <risk>` em `Baseline suppressions`, como achado.
- O revisor nunca edita o baseline.

## Entrada do baseline

```markdown
### <risk, one line>

- Why accepted: <the reasoning, not a hand-wave>
- Date: <YYYY-MM-DD>
- Rationale lives in: <code comment or ADR pointer>
```
