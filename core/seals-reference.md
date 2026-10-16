# Selos: detalhe, porquês e armadilhas

Complemento de `.claude/pipeline/core/seals.md` (a lista curta de consulta). Aqui ficam o raciocínio, os casos e as armadilhas.

## Selos e SHA

- Selo é um status de commit do GitHub: `state=success`, contexto `pipeline/<selo>`, gravado no **SHA da cabeça do PR**. Quatro selos: `review`, `e2e`, `screen`, `ux`.
- O selo pertence ao SHA. Commit novo no PR (correção, rebase) nasce **sem selo nenhum**, e cada etapa roda de novo sobre ele. É o comportamento nativo do GitHub; não há nada a construir.
- Cada selo leva uma `description` que aponta para a evidência (linha da nota, caminho do laudo). O GitHub limita a 140 caracteres e o script trunca.
- Não existe pular, sobrescrever nem forçar selo, nem `failure`, `pending` ou revogação. Etapa que não cabe ao tipo do PR **não é exigida**; etapa que cabe está gravada ou falta.

## Tipos e fallbacks

O tipo vem de `<seals.kinds>` (mapa `tipo → globs`), casado com **cada arquivo** do PR (lista completa por REST, paginada; `gh pr view --json files` corta em 100). PR com arquivos de mais de um tipo exige a **união**; a saída do `check` nomeia todos os tipos que exigem cada selo (`required by screen, app`), e o `review` é `required by every PR`.

| Tipo | Selos |
| --- | --- |
| `api` | `review`, `e2e` |
| `screen`, `app` | `review`, `screen`, `ux` |
| nenhum (prosa, skill, tooling, infra) | `review` |

Fallbacks, os mesmos de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Roteamento por tipo de PR" (o script os aplica, então um selo descartado nunca aparece na saída):

- sem `seals.kinds` → só `review` (o `/pipeline-doctor` exige `seals.kinds` quando há `team:`);
- sem `team:` → só `review`;
- `api` sem `team.e2e` → `screen` no lugar de `e2e` (o PR de API segue o roteiro de portal);
- `ux` só quando `team.roles.ux` está declarado;
- `app` sem `team.devices` → só `review`, para aquele tipo.

Pacote fora de qualquer tipo conta como só `review`: é decisão do repositório, escrita nos globs.

## Quem grava e quando

| Selo | Quem | Quando |
| --- | --- | --- |
| `review` | quem orquestra o ticket (`pipeline-execute-ticket`), a partir do laudo | logo depois do push (e do retarget) |
| `e2e` | validador de API (`team.roles.validatorApi`) | `APROVADO` do roteiro |
| `screen` | validador de tela e de app (`team.roles.validatorUi`); um selo para navegador e aparelho | `APROVADO` do **último** roteiro do PR |
| `ux` | especialista de UX (`team.roles.ux`) | `PRONTO` |

- O validador de reserva (`team.roles.validatorBackup`) recebe o comando do selo do papel que substitui.
- Nunca grava o selo de outro papel, e o **maestro não grava nenhum**.
- Validador só grava no `APROVADO` (UX: `PRONTO`), nunca em `REPROVADO`, `AJUSTAR`, `AMBIENTE FORA` ou `TRAVADO`. Roda o comando do roteiro literalmente e cola a linha `stamped pipeline/<selo> on <sha> for PR #<n>` na resposta. O `ux` só roda esse comando.
- A UX não lê código nem edita nada; o selo é o único comando que ela roda.

### Roteamento do maestro

- O SHA em todo despacho: `.claude/skills/pipeline-maestro/SKILL.md`, seção "PR aberto pelo executor", passo 2; o `check` antes do `maestri notify` da pilha: `.claude/skills/pipeline-maestro/SKILL.md`, seção "PR validado", passo 3. O roteamento pela saída do `check`, a ordem do PR misto, o `check` antes de `## Pronto para merge` e a revalidação parcial no SHA novo depois de uma correção (`carry` dos selos que o delta não toca, roteiro só do tipo tocado): `.claude/skills/pipeline-maestro/SKILL.md`, seção "Roteamento por tipo de PR" (caminho da correção: `.claude/skills/pipeline-maestro/SKILL.md`, seção "Achado do validador").
- **Selo que falhou** (autenticação, rede, sandbox): sintoma é o validador responder `APROVADO`/`PRONTO` sem a linha `stamped pipeline/<selo> …`, ou com a linha de erro. O maestro para e pergunta ao humano; nunca grava no lugar do validador e nunca move o item para `## Pronto para merge`.

## Revisão

- O revisor roda **antes** do push, e o GitHub recusa status num SHA que ele não conhece. Por isso o laudo traz `Reviewed head: <sha de 40 caracteres>` (de `git rev-parse HEAD`) sob `## Verdict`, e o selo é gravado **depois** do push. O script só grava se o veredito é `APPROVED` e o SHA do laudo é igual ao `--sha`.
- Commit feito depois do último laudo muda o `HEAD`: o laudo deixa de valer e exige outra rodada (conta no teto de 3).
- **Revisão delta**: o selo é do SHA e a correção chega depois do push, então ela passa por revisão antes de novo push. Os passos: `.claude/skills/pipeline-execute-ticket/SKILL.md`, seção "Revisão delta (correção depois do PR)".
- Depois: push, selo `review` na cabeça nova, `carry` de cada selo de validação que o delta não exige; o roteiro reprovado roda do passo reprovado até o fim, mais um smoke, e todo outro roteiro recusado roda inteiro.

## Herança de selo

- Por quê: correção só de API refazia o roteiro de tela e a UX inteiros, sem mudança nenhuma na tela. O selo continua do SHA; o `carry` só o copia quando o delta prova que o tipo não mudou.
- Condições, todas no script: selo de validação (`review` nunca); `--from` com o selo em `success`; `--from` ancestral da cabeça (`compare` com `status: ahead`, o que exclui rebase); delta abaixo de 300 arquivos; `requiredSeals` dos arquivos do delta não pede o selo.
- Arquivo fora de todo tipo (module map, doc) não exige selo de validação, então não impede o `carry`.
- Quem roda: o maestro, depois do `review` novo e antes de despachar roteiro. Herdar não é validar: o maestro nunca grava selo por `stamp`.
- Roteiro reduzido só para o roteiro **reprovado**, e só com a cabeça selada (a do PR antes da correção) ancestral da nova (`git merge-base --is-ancestor <cabeça selada> HEAD`): o `carry` dele sempre recusa por falta de selo, antes de olhar ancestralidade, então a checagem é do maestro. Todo outro roteiro recusado roda inteiro, inclusive o aprovado antes e tocado pelo delta, e o que nunca rodou (no PR misto, o seguinte ao reprovado): sem isso, um selo seria gravado sem o roteiro ter rodado em cabeça nenhuma.
- O delta inclui o caminho antigo de arquivo renomeado (`previous_filename`), para uma renomeação que tira arquivo de um tipo não escapar.

## Gancho de merge

- Hook `PreToolUse` em `.claude/settings.json`, só na ferramenta Bash do Claude Code. Merge pela interface do GitHub, `git merge` local com push ou outra ferramenta não passa por ele.
- **Lista de permissão**: comando sem `gh` ou sem `merge` passa na hora (sem rede, sem leitura de profile). Só `[rtk ]gh pr merge <número> [flags simples sem valor]` é conferido (selos e autorização); bloqueia, com `Merge blocked: use gh pr merge <number> …`: `gh pr` seguido de `merge` com flags no meio (`-R <repo>`) ou quebra de linha com `\`; `gh alias` com `merge` no comando; e comando com `gh api` que traga, em qualquer posição, `/merge`, `/merges`, `mergePullRequest` ou auto-merge (pipe com `--input -` e rota em variável incluídos). Leitura que só cita a palavra passa (`gh pr list --state merged`, `--json mergeCommit`, nome de branch).
- Por que deixou de ser "todo `gh` com `merge`": o bloqueio largo barrava leitura de rotina e nome de branch, e o custo caía no humano a cada sessão. Os padrões acima cobrem as formas que um agente escreve sem querer contornar. **Risco residual**, aceito porque exige intenção e contorno deliberado vence qualquer detecção por texto: `gh` entre aspas, `$GH` ou `$(which gh)`, `merge` montado em variável, mutação GraphQL em arquivo (`--input arquivo`), alias já existente na configuração do `gh` (`gh m 12`) e script chamado por `bash script`. Bloqueio falso custa reescrever o comando; merge não detectado custa o portão.
- Falha fecha: qualquer erro (perfil inválido, `gh`, rede, tempo) sai 2. O gancho tem prazo total (~40 s) e `gh` tem teto por chamada, porque gancho que estoura o tempo do Claude Code deixa o comando rodar.
- Não há flag de override.

## Autorização do humano

- O merge exige selos **e** autorização. O subcomando `authorize`, em `UserPromptSubmit`, grava `.git/pipeline-merge-auth.json` (`mode`, `issues`, `grantedAt`, `expiresAt` = +12 h), substituindo o anterior. Nunca bloqueia o prompt; erro vira linha em stderr. Sem `.git/` como diretório, não grava (e o merge fica bloqueado).
- O humano pede em texto livre, mas na forma de pedido: o script normaliza (minúsculas, sem acento, espaços colapsados, sem `.`/`!` final) e grava quando a mensagem tem até 200 caracteres, não termina em `?`, abre com o pedido (aberturas `ok`, `beleza`…; depois **uma** palavra de pedido, `pode`, `faz`, `manda`, `segue`, `bora`, `vai`, `autorizo` ou `libera`, seguida só de `fazer`, `com` ou artigo, até `merge`; ou direto `mergear`/`mergeia`/`mergeie`) e todo o resto é alvo: `#n`, número solto só antes de `PRs`, `tasks`, `tickets` ou `issues` (`3 PRs`; `pode mergear o 12` recusa, porque viraria lote inteiro), `tudo`, `in review`, `pilha`, `task`, `pr`, `pra mim`, `por gentileza`, artigos e preposições (`esta`/`ta` só depois de `que`). Artigo não é pedido: `o merge do #12 esta em review` descreve, não pede, e recusa. `#n` presentes → lista; sem `#n` → lote (`faça o merge dos 3 PRs pra mim` e `pode fazer o merge` são lote: pedido explícito do humano não exige nomear o escopo). Antes era a frase exata; virou pedido livre porque a frase travava o humano sem proteger mais.
- Por que lista fechada de palavras no resto, e não "contém": "contém" gravava `pode mergear a pilha, menos o #14` como lista [14] (o excluído), `pode fazer o merge depois que eu revisar tudo` como lote, e `nunca mergeia o #12 sem selo` como [12]. Condição, exclusão e negação ficam fora da lista e recusam; o humano reescreve como pedido simples.
- Por que curta: com "contém", uma mensagem que só **citava** a frase (instrução documentando-a) gravou autorização de lote ao vivo. Mensagem de agente repassada, conteúdo colado e documento são longos ou trazem tag; pedido do humano é curto. Por isso o agente nunca escreve um pedido de merge em mensagem que vá para outro terminal.
- Formas antigas, que continuam valendo: `pode fazer merge de tudo que esta em in review` (lote); `pode fazer merge da task #X`; `pode fazer merge das tasks #X #Y …` (lista; `#n` separados por espaço ou vírgula).
- O PR é coberto pelas issues que fecha (`closingIssuesReferences`) ou pelo próprio número. Lista: o `#n` do PR está nomeado, ou toda issue de fechamento está; PR sem issue precisa ser nomeado. Lote: o Status de toda issue de fechamento no board é `In review`; PR sem issue de fechamento entra no lote (PR de processo feito sem ticket).
- Falta de selo e falta de autorização são relatadas juntas, com o motivo.
- **Só o prompt do humano grava.** O hook bloqueia comando de Bash cujo texto contém `pipeline-merge-auth` e toda escrita/edição (`Write`, `Edit`, `MultiEdit`, `NotebookEdit`) sobre ele. Agente nenhum escreve nem cita o arquivo; inspeciona-se com a ferramenta de leitura.
- **Risco residual**: qualquer texto submetido como prompt de usuário na sessão (inclusive mensagem digitada no terminal por outra ferramenta) dispara o `authorize`. É guarda contra etapa esquecida, não contra adversário.

## Armadilhas

- **SHA**: commit novo zera os selos. Corrigir é revisar o delta, gravar `review`, herdar por `carry` o que o delta não toca e revalidar só o resto.
- **Pilha**: rebasear as branches de cima depois de uma correção embaixo muda os SHAs e derruba todos os selos delas. Pilha mergeia de baixo para cima, com merge commit e retarget, sem rebase.
- **Texto com `gh pr merge`**: corpo de PR em heredoc, mensagem de commit e busca que trazem o comando são bloqueados. Passe por arquivo (`--body-file`, `git commit -F`).
- **Status não se apaga**: nunca grave selo num PR para testar o script.
- **Selo que falhou**: o maestro para e pergunta ao humano (ver acima).
