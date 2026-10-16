# O gate de revisão

Motivos dos passos de `.claude/skills/pipeline-execute-ticket/SKILL.md`, seção "Fase 5 — Gate de revisão, antes de existir PR" e das subseções dela. Nenhuma ação nova mora aqui.

## Contexto limpo

- O valor do gate é o revisor **não ter visto o seu raciocínio**; um subagente entrega isso sem worktree, sem install e sem terminal coordenado.
- Revisar o próprio código no mesmo contexto é teatro: você concorda com o que acabou de escrever.
- O contexto limpo protege contra o viés do implementador, não contra as rodadas anteriores: só a rodada 1 sobe revisor novo.
- Subagente nativo e não orquestrador externo, porque o papel é o que carrega as instruções do revisor.
- O range é o `<parent>` num ticket empilhado: com a base do profile, o revisor recebe o diff do ticket anterior junto, gasta a rodada em código que já passou pelo gate dele e devolve achado fora de escopo.

## Rodada 2 em diante

- O código fora do delta já passou pela rodada anterior; revisá-lo de novo custa uma rodada inteira de tokens e devolve achado fora de escopo.
- `Reviewed head` é o ponto exato que a rodada anterior viu, então nada entre as duas rodadas escapa.
- Da rodada 2 em diante o mesmo revisor recebe o delta por `SendMessage`: ele já tem skill, mapas e diff carregados, então reler tudo num revisor novo é custo sem ganho. Se a consulta de prosa ou o gatilho de segurança mudou desde a rodada anterior, o revisor também é substituído, por um novo no modelo do frontmatter e com o range da rodada 1. Revisor que não aceita mais mensagem é substituído; abaixo de 80 linhas alteradas no delta e sem gatilho de segurança, o substituto roda em Sonnet.
- Dois pontos porque a cabeça anterior é ancestral de `HEAD` na mesma branch.
- A revisão é por ticket: cada ticket da pilha já passou pelo próprio gate, no range dele; rever a pilha inteira por conta própria gasta tokens sem achar o que o gate dele não achou.

## Uma correção só

Cada correção partida custa mais uma rodada inteira de um ou dois revisores e gasta o teto de 3 rodadas com achados que já eram conhecidos.

## NIT não abre rodada

Commit depois do último laudo o invalida, e o selo `review` amarra o `Reviewed head`: `pipeline-gate.mjs stamp` recusa laudo que revisou outra cabeça. NIT aplicado depois da aprovação custa uma rodada nova inteira. Detalhe: `.claude/pipeline/core/seals-reference.md`, seção "Revisão".

## Gatilho seletivo

- O gatilho é do orquestrador, não do revisor: a skill de segurança não se autoaciona.
- Disparar em todo diff dobra o custo do gate, e gate caro demais é gate desligado.

## Espera e sentinela

- Uma rodada leva de 5 a 15 minutos e o revisor não manda sinal de progresso. Revisor fechado antes do laudo é rodada que não aconteceu, e relançar começa do zero.
- Esperar sem olhar tem o risco oposto: um subagente que parou de trabalhar sem avisar (esperando um processo em segundo plano que já morreu, por exemplo) segura o ticket por horas.
- O sinal é o transcript crescendo, porque cada chamada de ferramenta grava nele; por isso `STALLED` (15 minutos) não é revisor lento. Ler o conteúdo do transcript enche o seu contexto.
- O `output_file` é um link simbólico para o transcript, e o script segue o link.
- Lançamento em primeiro plano bloqueia o orquestrador até o fim e não deixa nada para armar.

## Triagem

- O implementador não tem como separar achado falso, e corrigir achado falso muda código correto; por isso ele recebe a lista triada, nunca o laudo cru.
- O orquestrador decidiu a abordagem e responde pelo código, então tem viés a favor dele; é por isso que, na dúvida, o achado procede.
- Ping-pong entre rodadas é sinal de spec ambígua, não de código ruim.

## Corrigir a classe

- Achado que procede é amostra de um padrão; o revisor aponta o exemplo que viu, não o inventário.
- Exemplos: cópia de schema costuma ter a cópia do mapper ao lado; helper duplicado costuma ter homônimo em outro módulo; campo sensível que vazou num log costuma vazar no log vizinho.
- Cada irmão que o revisor só acha na rodada seguinte custa uma rodada inteira dos dois revisores, e é a parte cara do gate.
- Remendar caso a caso é o que faz a rodada 3 achar o próximo irmão; o caminho mais simples que resolve a classe inteira evita isso.

## Armadilhas

- **Revisar o próprio código no mesmo contexto.** Sem contexto limpo o gate vira teatro: você concorda com o que acabou de escrever.
- **Revisar um ticket empilhado contra `origin/<branches.base>`.** O revisor recebe o diff do ticket anterior junto e gasta a rodada em código já aprovado. O range é o `<parent>`.
- **Fechar o revisor por impaciência.** Espera curta em laço, "status check" e `close_agent` num revisor que ainda roda matam a rodada a minutos do laudo. Revisor rodando é revisor trabalhando: espere — com o sentinela armado.
- **Esperar sem sentinela.** Subagente que parou sem avisar segura o ticket até alguém olhar. O sentinela observa o transcript sem interromper e só age em parada confirmada.
- **Parar o implementador que ainda vai ser usado.** `TaskStop` no subagente depois do relatório derruba a correção por `SendMessage` e força um implementador novo, sem o contexto do anterior. Pare o sentinela sempre; o subagente, só quando o trabalho dele acabou ou a parada está confirmada.
- **Disparar o revisor de segurança em todo diff.** O gatilho existe para o gate caber no custo; diff de UI, i18n, doc ou token de design não chama o revisor de segurança.
- **Repassar o laudo cru ao implementador.** Achado falso vira código correto alterado e uma rodada perdida. Ele recebe a lista triada.

## Retrabalho de tela

- Duas voltas da mesma tela mostram que o alvo não é compartilhado; um terceiro remendo sem alvo repete o laço.
- O mockup aprovado pelo humano é o alvo.
- O executor reinicia a cada ticket e a cada correção, então a conta mora na nota do maestro, por PR e por tela; ele escreve `volta <k> da tela <rota>` em cada correção. Fora do Maestri a sessão conta.
- Só voltas depois do PR contam: a rodada de revisão anterior ao PR julga o diff contra a spec, não a tela contra o solicitante.
- O mockup vai também ao `## Decisions` do PR para ficar registrado, ao lado da mudança, como decisão do solicitante.
- É assim que ele chega à revisão de UX: o maestro entrega à especialista as "decisões do solicitante" de cada tela (`.claude/skills/pipeline-maestro/SKILL.md`, seção "Validação de UX"), e decisão do solicitante vence sugestão de UX.

## Prompt do revisor

Passos do passo 4 da Fase 5 de `.claude/skills/pipeline-execute-ticket/SKILL.md` (a rodada 1 sobe revisor novo; da rodada 2 em diante vale o `SendMessage` descrito lá):

4. Rodada 1: lance o agent `pipeline-reviewer` pelo Agent tool, em segundo plano; ele sobe em contexto limpo, com o modelo e as skills (`pipeline-project-profile`, `pipeline-review-diff`) já no frontmatter. Rodada `r` ≥ 2: não lance outro; mande `SendMessage` ao **mesmo** revisor (e ao mesmo revisor de segurança, se ele rodou e o gatilho ainda dispara sobre o delta; revisor de segurança que nunca rodou e o delta agora dispara → um novo sobre `<parent>...HEAD`) com o range delta, os achados triados e o caminho do laudo novo `<scratchpad>/review-<n>-r<r>.md`; revisor que não aceita mais mensagem, ou que a consulta do passo 2 manda trocar → lance um novo pela regra do passo 2. Motivo: `.claude/skills/pipeline-execute-ticket/reference/review-gate.md`, seção "Rodada 2 em diante". O prompt da rodada 1 leva, inline:
   - a especificação inteira do ticket e a lista `Also fixed` até aqui (ou "none");
   - os critérios de aceite como checklist, uma linha por critério: `- [ ] <critério> — verify: <como>`. Critério sem `— verify:` (ticket anterior à forma canônica) → você escreve o método na linha: um comando com a saída esperada, uma captura, ou o texto exato esperado num arquivo e seção. Motivo: `.claude/skills/pipeline-review-diff/reference/porques.md`, seção "Critério com método";
   - o caminho absoluto do laudo, `<scratchpad>/review-<n>-r<r>.md`, e o número da rodada;
   - o range da rodada 1: `git diff <parent>...HEAD`, nunca a base do profile num ticket empilhado: diga no prompt qual é o `<parent>` e que o ticket anterior da pilha já foi revisado. Armadilha: `.claude/skills/pipeline-execute-ticket/reference/review-gate.md`, seção "Armadilhas";
   - o range da rodada `r` ≥ 2 (na mensagem ao mesmo revisor, ou no prompt de um novo): `git diff <Reviewed head da rodada r-1>..HEAD` (dois pontos), com o SHA de `grep -m1 '^Reviewed head:' <scratchpad>/review-<n>-r<r-1>.md` → o laudo não tem a linha: relance a rodada `r` com o range da rodada 1 e diga o motivo no `## Test plan`. Motivo: `.claude/skills/pipeline-execute-ticket/reference/review-gate.md`, seção "Rodada 2 em diante";
   - na rodada `r` ≥ 2, os achados triados das rodadas anteriores, dos dois laudos: cada um como procede → o que foi pedido, ou descartado → a evidência.

## Revisor fora do Claude Code ou indisponível

Passos dos passos 5 e 6 da Fase 5 de `.claude/skills/pipeline-execute-ticket/SKILL.md`:

5. Fora do Claude Code o mesmo agent tem outro nome de ferramenta, que a tabela de `AGENTS.md`, seção "Revisão em contexto limpo — obrigatória, e é aqui que as ferramentas divergem", dá. No Codex é `spawn_agent` com `agent_type: "pipeline-reviewer"` (e `"pipeline-security-reviewer"`), definidos em `.codex/agents/`, e `fork_context: false`.
   - Fora do Claude Code não há override de modelo: o revisor roda no modelo da própria definição. `.claude/pipeline/core/entrada.md`, seção "Fora do Claude Code".
   - Subagente nativo sempre → nunca orquestrador externo (Orca, tmux, outra sessão de terminal) nem `agent_type` genérico: o papel é o que carrega as instruções do revisor.
6. Agent indisponível (`.claude/agents/` não carregou na sessão, versão antiga do Claude Code) → não revise você mesmo; lance um agent `general-purpose` com `model: sonnet` quando o passo 2 decidiu Sonnet e `model: opus` no resto (o substituto do `pipeline-security-reviewer` fica sempre em `model: opus`), que leia primeiro, por caminho absoluto, `.claude/skills/pipeline-project-profile/SKILL.md` e `.claude/skills/pipeline-review-diff/SKILL.md` (ou `.claude/skills/pipeline-security-audit/SKILL.md`, no lugar do `pipeline-security-reviewer`).
   - No Codex o equivalente é o `agent_type` não aparecer no `spawn_agent`: confira `.codex/agents/` e o trust do projeto no `~/.codex/config.toml` antes de cair num `agent_type: "default"` com as mesmas leituras.

## Contagem das voltas de tela

Passos do passo 2 da "Revisão delta (correção depois do PR)" de `.claude/skills/pipeline-execute-ticket/SKILL.md`:

2. Antes de mandar a correção ao implementador, conte as voltas de cada tela que ela toca: cada pedido de correção depois que o PR existe sobre aquela tela (`REPROVADO` de validação de tela ou app, `AJUSTAR` da UX, review humano). A tela é a rota (web) ou a tela (app) que o pedido nomeia; rodada de revisão anterior ao PR (Fase 5) não conta; a conta é por tela e por PR. Sob o maestro ela é dele (na nota): o pedido de correção traz `volta <k> da tela <rota>` e você usa esse `k`; sem pedido do maestro (fora do Maestri), conte na sessão.
   - 1ª e 2ª volta da tela → correção como hoje. 3ª volta da mesma tela → pare de remendar: desenhe o mockup HTML da tela corrigida como Artifact (sem Artifact: o fallback de `.claude/skills/pipeline-write-ticket/SKILL.md`, seção "Fase 2 — Perguntar o que só o usuário sabe"), obtenha a aprovação do humano (sob o maestro, `TRAVADO: <motivo>` com o link) e só então mande a correção, com o mockup no brief; o link e a data da aprovação vão também ao `## Decisions` do PR, como no passo 8 da Fase 2.
   - Mockup aprovado → as voltas seguintes da tela se corrigem contra ele; não há segundo mockup, salvo pedido do humano.
   - Detalhe: `.claude/skills/pipeline-execute-ticket/reference/review-gate.md`, seção "Retrabalho de tela".
