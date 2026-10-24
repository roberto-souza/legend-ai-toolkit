---
name: pipeline-maestro
description: |
  Orquestra o time no Maestri (maestro, executor, validador de API e validador de tela e de app): despacha a fila do board, acompanha e valida cada PR
  Use quando: "monta o time", "sobe o maestro", "orquestra a fila no Maestri", "despacha a coluna Ready", "valida os PRs no Maestri".
---

O maestro é a sessão que invoca esta skill: despacha, acompanha e mantém a nota de estado; **nunca edita código** e nunca grava selo. O executor roda o `/pipeline-execute` num clone isolado; os validadores percorrem um roteiro fechado por PR, com o critério de `<knowledge.verification>`. O merge é do humano. A especialista de UX e o validador de reserva entram quando o profile os declara. Fato do repositório vem do profile (`<team.…>`, `<board.…>`, `<repo>`, `<branches.base>`); processo, daqui (`.claude/skills/pipeline-maestro/reference/setup.md`).



Notação: `<raiz>` é a raiz do checkout principal (`git rev-parse --show-toplevel`); `<EXEC>`, `<VAL-API>`, `<VAL-UI>`, `<UX>`, `<VAL-2>` são os terminais `[EXECUTOR]`, `[VALIDADOR API]`, `[VALIDADOR UI]`, `[UX]` e `[VALIDADOR 2]` seguidos de `<team.roles.<papel>.tool>`; `<gate>` é `node <raiz>/.claude/pipeline/core/pipeline-gate.mjs`; `<crit>` é `<knowledge.verification>`; `<roles>` é `.claude/skills/pipeline-maestro/roles`. 

## Entrada

1. Carregue `pipeline-project-profile` primeiro (a trava de repositório vem antes de qualquer `gh`).
2. Profile sem `team:` → pare: este repositório não orquestra no Maestri. Sem `knowledge.verification` (ou arquivo ausente) → pare: a orquestração exige o critério de verificação.
3. Exija `maestri` no PATH e a sessão em Maestro Mode (`maestri list` responde); senão pare e mostre a saída.
4. Com `<team.roles.maestro.model>`, confira o modelo da sessão e avise o usuário se diferir (aviso, não parada; `.claude/skills/pipeline-maestro/reference/setup.md`, seção "Modelo do maestro").
5. Liste os comandos `maestri` (`check`, `ask`, `note`, `portal`, `recruit`, `dismiss`, `role`, `routine`, `notify`, `floor`, `connect`, `list`) e o `.claude/skills/pipeline-maestro/maestro-sentinel.sh *` que o `.claude/settings.local.json` (nunca versionado) precisa liberar.
6. **Retomada.** `maestri list` mostra a nota `<team.note>` → leia a nota, confira em `maestri list` quais terminais existem e rode do "Setup do time" só os passos cujo resultado falta; nunca se apoie no histórico da conversa. Pilha em `## Em execução` → re-arme o sentinela (passo **Monitor.**). Detalhe: `.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Uma sessão por demanda".

## Setup do time

1. Terminais: os da notação.
2. **Clone isolado.** `maestri floor create "<nome>"`; a raiz do clone é a que o comando informa (`maestri floor list`). Nunca apague o floor (apaga o clone). Grave a raiz em `## Decisões` (`.claude/skills/pipeline-maestro/reference/setup.md`, seção "O floor não se apaga").
3. **Executor.** `maestri recruit "<EXEC>" --command "<team.roles.executor.command>" --dir <raiz do clone>`, **sem `--role`** (`.claude/skills/pipeline-maestro/reference/setup.md`, seção "Executor sem role e com dir").
4. **Papel do executor.** Depois de **cada** subida, mande `.claude/skills/pipeline-maestro/roles/executor.md` resolvido: `maestri ask "<EXEC>" "<conteúdo>"`.
5. **Conferir o executor.** `maestri check "<EXEC>"`: o cabeçalho mostra a raiz do clone e, com `<team.roles.executor.model>`, o modelo declarado; diferente → `maestri dismiss`, recrute de novo e nunca siga.
6–7. **Validadores.** Papel "Validador API" (`<roles>/validador-api.md` resolvido, `maestri role create`) e `maestri recruit "<VAL-API>" --role "Validador API"`; `maestri recruit "<VAL-UI>" --dir <raiz>` **sem `--role`**, com `<roles>/validador-ui.md` enviado por `maestri ask`. Leia `.claude/skills/pipeline-maestro/reference/setup.md`, seção "Recrutar os validadores", e siga os passos.
8. **Nota de estado.** `maestri note create "<conteúdo>" --name "<team.note>"` com `## Fila`, `## Em execução`, `## Em validação`, `## Pronto para merge` e `## Decisões` (já com o slug do tenant de teste **e a raiz do clone**); sem slug conhecido, pergunte ao usuário antes de seguir.
9–12. Portais e UX: `maestri portal create` para `<team.portals>` (e simuladores livres de `<team.devices>`) numa só mensagem ao `<VAL-UI>`, que cria cada portal e devolve os `udid` (para `## Decisões`); com `<team.roles.ux>`, recrute `<UX>` sem `--role` e mande `<roles>/ux.md`. Leia `.claude/skills/pipeline-maestro/reference/setup.md`, seção "Portais e especialista de UX", e siga os passos.
13. **Conexões.** `maestri connect "<VAL-API>" "<team.note>"` e o mesmo para `<VAL-UI>`, só validador ↔ nota (`.claude/skills/pipeline-maestro/reference/setup.md`, seção "Conexões só validador e nota").

## Despacho e acompanhamento

Motivos: `.claude/skills/pipeline-maestro/reference/despacho.md`.

### Escritor de tickets sob demanda

Demanda nova, sem ticket: o maestro não escreve ticket, recruta o escritor e sai do caminho.

1. Sem `team.roles.ticketWriter`, não recrute escritor: diga ao usuário para rodar `/pipeline-ticket`.
2–6. Recrute `[TICKET] <team.roles.ticketWriter.tool>` sem `--role` em `<raiz>`, confira o modelo, mande `/pipeline-ticket <demanda>`, deixe o humano responder no terminal, mova para `Ready` só o que ele autorizou e dispense o terminal. Leia `.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Passos do escritor de tickets", e siga os passos.

### Fila e despacho

1. **Fila.** `gh project item-list <board.number> --owner <board.owner> --limit 300 --format json`, Status `Ready` e `.content.repository` igual a `<repo>` (filtro: `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Mover o card").
2. **Blockers.** Por item, `gh issue view <n> --json blockedBy` (`.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Grafo de dependências"); `blockedBy` aberto → o item fica na fila com o blocker anotado.
3. **Teto da pilha.** No máximo 8 tickets (`.claude/skills/pipeline-execute-ticket/SKILL.md`, seção "A fila"); série maior vira pilhas de até 8, uma por vez, a seguinte só depois do merge da anterior.
4. **Contexto limpo por ticket.** Todo ticket (o primeiro e cada um depois de `PILHA PRONTA`) começa com o executor reiniciado: `maestri recruit "<EXEC>" --command "<team.roles.executor.command>" --dir <raiz do clone> --replace "<EXEC>"`, depois **Papel do executor.** e **Conferir o executor.**; recusa de `--command`/`--dir` ou diretório errado → dispense, recrute sem `--replace` e reconecte (`.claude/skills/pipeline-maestro/reference/armadilhas.md`, seção "Terminais e papéis").
5. **Correção.** Vai a um executor reiniciado (passo 4), com `/pipeline-execute #<n>` e o pedido: PR, branch, passo reprovado, evidência e, em achado de tela, `volta <k> da tela <rota>`; nunca "mesmo executor" (`.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Um executor limpo por ticket").
6. **Despacho.** Ticket a ticket: `maestri ask "<EXEC>" "/pipeline-execute #<n> --parent <branch do ticket anterior>"`, o primeiro sem `--parent` (`.claude/skills/pipeline-execute-ticket/SKILL.md`, seção "A fila"); a pilha vai para `## Em execução`. A cada `PILHA PRONTA` de ticket que não é o último: anote o PR, reinicie o executor (passo 4) e despache o próximo; a validação só começa depois do último.
7. **Monitor.** Depois de cada despacho, correção e pedido de capturas, arme `Monitor` com `.claude/skills/pipeline-maestro/maestro-sentinel.sh "<EXEC>" "<team.note>" 20 60` e re-arme ao expirar; nunca `maestri check` em laço. Fora do Claude Code, rode o script em segundo plano e leia a saída, com a mesma regra (`.claude/skills/pipeline-maestro/reference/despacho.md`, seção "O maestro acorda só por evento").
   - Antes de armar, olhe a tela (o retorno do `maestri ask` vale, senão `maestri check`): `PILHA PRONTA`/`CAPTURAS PRONTAS`/`TRAVADO` ainda não tratado na nota → trate como evento (passo **Eventos.**).
8. **Eventos.** Pare o `Monitor` e aja só nas linhas do sentinela. `PILHA PRONTA` de ticket intermediário: anote o PR em `## Em execução` e siga o passo 6; do último ticket ou de correção: por PR, de baixo para cima, "PR aberto pelo executor" e troque a linha do sentinela pelo item de "Nota de estado". `CAPTURAS PRONTAS`: "Validação de tela", passo 3 (reprodução de passo pontual: passo 6). `TRAVADO`: `maestri notify` e a pergunta ao usuário; re-arme com a resposta. `STALLED`: um `maestri check` e **uma** cutucada; o segundo vira `TRAVADO` (`.claude/skills/pipeline-execute-ticket/SKILL.md`, seção "O sentinela"). `check failed`/`note edit failed`: confira terminal e nota e re-arme. Leia `.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Eventos do sentinela", e siga os passos.

### PR aberto pelo executor

1. `git fetch origin`, `git switch <branch>` e `git pull --ff-only` no checkout principal (`.claude/skills/pipeline-maestro/reference/despacho.md`, seção "O maestro faz fetch e switch").
2. Anote `git rev-parse HEAD` (o SHA; todo roteiro e mensagem do PR leva PR, branch e SHA). Difere de `gh pr view <pr> --json headRefOid --jq .headRefOid` → pare: o checkout não está na cabeça do PR.
3. Suba só o que falta, nesta ordem: `<team.dev.infraRequires>` atendido, `<team.dev.infra>`, `<team.dev.migrate>`, `<team.dev.up>`.
4. Mova o item para `## Em validação` e siga "Roteamento por tipo de PR".

### Roteamento por tipo de PR

1. Rode `<gate> check --pr <pr>` (tipos por `<seals.kinds>`; contrato: `.claude/pipeline/core/seals.md`): cada linha `MISSING` é uma etapa, com os tipos que a exigem (`.claude/skills/pipeline-maestro/reference/despacho.md`, seção "O roteamento lê o check").
2. **Etapa E2E.** `pipeline/e2e` faltando → "Validação de API por E2E"; sem `team.e2e`, o PR de API segue o roteiro de portal e a nota registra "E2E de API não configurado".
3. **Etapa de tela.** `pipeline/screen` exigido por `screen` → "Validação de tela".
4. **Etapa de app.** `pipeline/screen` exigido por `app` (muda o app móvel de `<team.devices>`) → "Validação de app"; com `screen` e `app` na linha, navegador primeiro. Sem `<team.devices>`, siga o passo 7 com o motivo "app móvel sem aparelho declarado".
5. **Etapa de UX.** `pipeline/ux` faltando → "Validação de UX", só depois do `APROVADO` de tela e de app; o item não sai de `## Em validação` sem `PRONTO` aceito pelo maestro.
6. **PR misto.** E2E, depois tela ou app, depois UX; cada etapa só depois do `APROVADO` da anterior.
7. **PR sem rota nem tela** (só a linha `review`: prosa, skill, tooling). Nenhum validador recebe roteiro: mova o item direto a `## Pronto para merge` com "sem validação no Maestri: <motivo>"; a revisão e o gate verde são a validação e a regra da pilha de "Merge" não muda.
8. **Selo.** Todo roteiro termina com o selo do seu tipo, último passo e só no sucesso; a mensagem de UX leva o comando do `ux`; o validador de reserva recebe o do papel que substitui. O maestro nunca grava selo (`.claude/pipeline/core/seals-reference.md`).
9. **Resposta sem selo.** `APROVADO` ou `PRONTO` sem a linha `stamped pipeline/<selo> …`, ou com erro → pare e pergunte ao humano; nunca grave o selo no lugar do validador nem mova para `## Pronto para merge` (`.claude/pipeline/core/seals-reference.md`, seção "Roteamento do maestro").
10. **Conferir antes de `## Pronto para merge`.** Todos os roteiros que cabem ao PR `APROVADO` (e `PRONTO` da UX quando cabe) e `check --pr <pr>` saindo 0, com o resultado na linha da nota; senão volte ao passo 1.

### Validador de reserva

1. Vale quando o validador de API **ou** o de tela responde sem cota (recusa por limite de uso). Sem `team.roles.validatorBackup` → pare, avise o usuário e não despache a ninguém.
2–6. Recrute `<VAL-2>` sem `--role`, mande o papel de quem caiu, ligue-o à nota e despache o mesmo roteiro com o selo do papel que substitui (portais com ` 2` no `name` se é o de tela); a nota registra quem validou. Leia `.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Passos do validador de reserva", e siga os passos.

### Achado do validador

1. `REPROVADO` volta ao executor **pelo maestro**, na mesma branch, com o passo que falhou, a evidência e, em achado de tela, `volta <k> da tela <rota>`; vale para o PR de qualquer posição da pilha; logo depois, arme o sentinela (passo **Monitor.**).
2. O executor corrige no mesmo PR, com revisão delta e selo `review` novo (`.claude/skills/pipeline-execute-ticket/SKILL.md`, seção "Fase 5 — Gate de revisão, antes de existir PR").
3. Só a partir do `PILHA PRONTA` que lista o PR corrigido, refaça os passos 1 e 2 de "PR aberto pelo executor" (SHA novo, depois do `git pull --ff-only`) e rode `<team.dev.migrate>` de novo (passo 3 de "PR aberto pelo executor"), mesmo com o ambiente já de pé: a correção pode trazer migration. Depois, revalidação parcial:
   - para cada selo de validação que o PR exige, rode `<gate> carry <selo> --pr <pr> --from <cabeça selada>` (a cabeça do PR antes da correção); `carried …` → esse roteiro não roda de novo;
   - o roteiro **reprovado**, com a cabeça selada ancestral da nova (`git merge-base --is-ancestor <cabeça selada> HEAD` sai 0) → redespache-o do passo reprovado até o fim, mais um smoke de 2–3 passos anteriores; a UX com `AJUSTAR`, só as telas com `AJUSTAR`. Pelo passo 1 de "Roteamento por tipo de PR";
   - todo outro roteiro recusado (aprovado antes mas tocado pelo delta, nunca rodado, não ancestral, delta grande) e o reprovado sem ancestralidade ou quando o delta muda o fluxo do PR (rota, contrato, tela nova) → roteiro inteiro;
   - contrato: `.claude/pipeline/core/seals.md`.
4. Achado de passo pontual de tela cuja captura contradiz o comportamento → parágrafo **Artefato do portal.** de "Validação de tela" antes de voltar ao executor.
5. `AMBIENTE FORA` não é achado: suba o ambiente (passo 3 de "PR aberto pelo executor") e redespache o roteiro.

### PR validado

1. PR com tela e `<team.roles.ux>`: o `APROVADO` de tela vai para "Validação de UX" e o item só vai a `## Pronto para merge` com o `PRONTO` aceito ("Conferência do `PRONTO`").
2. Nos demais: `check --pr <pr>` saindo 0 → `## Pronto para merge` anotando que aguarda o resto da pilha, **sem notify** (`.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Sem notify por PR").
3. Pilha inteira validada → `check --pr` em **cada** PR, todos saindo 0, depois `maestri notify "pilha pronta para merge: PR #<a>, #<b>, …"` na ordem de merge.

### Merge

1. O merge é do humano: só quando ele pedir.
2. Só com a **pilha inteira** terminada no executor, todos os PRs abertos e validados (`APROVADO`, e, com `<team.roles.ux>`, todas as telas em `PRONTO` aceito); nunca PR por PR (`.claude/skills/pipeline-maestro/reference/despacho.md`, seção "A pilha inteira antes do merge").
3. Peça ao humano o pedido de merge de `.claude/pipeline/core/seals.md` (curto, texto livre, como `pode mergear a pilha`); nunca o escreva em mensagem a outro terminal nem cite o arquivo da autorização.
4. Merge **de baixo para cima** (`.claude/skills/pipeline-github-tickets/SKILL.md`, seção "PR empilhado"), sem rebase. Por PR: `gh pr edit <pr> --base <branches.base>`, depois `gh pr merge <número> --merge`, sozinho na chamada.
5. Bloqueio por selo ou autorização → relate ao humano; nunca contorne o gancho.
6. Depois dos merges, volte o checkout principal para `<branches.base>`, apague as branches locais da pilha e despache a próxima pela etapa **Contexto limpo por ticket.**
7. **Fim da demanda.** Última pilha mergeada, ou o humano encerrou → deixe a nota em dia para retomar e diga ao humano para abrir sessão nova para a próxima demanda (`.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Uma sessão por demanda").

### Release publicada

1. Só depois de release de produção e **só quando** `.claude/pipeline/ticket.md` tem `## Andamento`: abra um ticket de andamento pelo escritor sob demanda; o maestro não edita o documento. Leia `.claude/skills/pipeline-maestro/reference/despacho.md`, seção "Passos da release publicada", e siga os passos.

## Validação de API por E2E

O critério está em `<crit>`, seção "PR de API"; antes de escrever o roteiro, leia `.claude/skills/pipeline-maestro/reference/validacao-api.md`, seção "Passos", e siga os passos (1 a 16). Ordem:

1. Leia o critério; aplique ao PR de API sem tela e à parte de API do PR misto. Sem `team.e2e` → roteiro de portal e a nota "E2E de API não configurado".
2. Prepare o ambiente ("PR aberto pelo executor"); no Ground, limpe e recrie `<raiz>/.maestri/e2e/pr<pr>` (fora do roteiro).
3. Escreva o roteiro (passos 3 a 10 do detalhe): cabeçalho com as "Proibições" de `<roles>/validador-api.md`, passo 0 `AMBIENTE`, login novo por papel, casos mínimos do critério e cenários de verificação do ticket; o maestro escreve tudo.
4. Último passo do roteiro, só no sucesso: `<gate> stamp e2e --pr <pr> --sha <sha> --evidence "<…>"`. Envie `maestri ask "<VAL-API>" "<roteiro>"`, sem citar portal.
5. Leia a resposta por `<roles>/validador-api.md`, seção "Resposta"; apague a pasta da rodada em qualquer resposta; `REPROVADO` e `AMBIENTE FORA` seguem "Achado do validador"; com `APROVADO`, confira o log da API na janela da rodada (`FALHA` → `REPROVADO`).
6. Confira `stamped pipeline/e2e …` (parágrafo **Resposta sem selo.** de "Roteamento por tipo de PR"). Nenhum arquivo de teste nasce do roteiro.

## Validação de tela

O critério está em `<crit>`, seção "PR de tela"; antes de escrever o roteiro, leia `.claude/skills/pipeline-maestro/reference/validacao-tela.md`, seção "Passos", e siga os passos (1 a 16). Sem `<team.roles.ux>` → pare e diga ao humano que as capturas vão para a pasta de `team.roles.ux`, que precisa estar declarada.

1. Leia o critério. Aplique ao PR de tela e à parte de tela do PR misto; PR de API sem `team.e2e` não recebe pedido de capturas (vira passo de portal). `<pasta>` é `<raiz>/<team.roles.ux.dir>/pr-<n>/` (`k` ≥ 2: `.../rodada-<k>/`).
2. **Pedido de capturas** (passo 3 do detalhe): `maestri ask "<EXEC>"` com PR, branch, SHA, `#<n>`, `k`, `<pasta>`, variante base de cada front, `url` de `<team.portals>` com `{slug}`, credenciais só pelo nome e as irmãs; logo depois, arme o sentinela (passo **Monitor.**).
3. **`CAPTURAS PRONTAS`** (passo 4 do detalhe). Abra `<pasta>/capturas.md`. Linha `FALHA DO SCRIPT` → pergunte ao executor se o defeito é do script (novo pedido no mesmo SHA e rodada) ou do código (siga "Achado do validador" como `REPROVADO`); o executor não corrige código sem essa ordem.
4. Escreva o roteiro de conferência (passos 5 a 9 do detalhe), com `<gate> stamp screen --pr <pr> --sha <sha> --evidence "<…>"` como último passo, só no sucesso e só sem roteiro de app depois; envie `maestri ask "<VAL-UI>"` e leia a resposta por `<roles>/validador-ui.md`, seção "Resposta".
5. Antes de aceitar `APROVADO`, abra cada captura de estado transitório; linha que afirma elemento aberto com imagem sem ele → `REPROVADO` do roteiro, não do PR (redespache o passo).
6. **Artefato do portal** (passo 14 do detalhe). Captura e comportamento divergem mesmo depois de `getAnimations().finish()` → `.claude/skills/pipeline-maestro/reference/captura.md`, seção "Artefato do portal": a captura do script prevalece no navegador e o achado é descartado com "artefato do portal" na nota; divergência reproduzida é achado.
7. Confira `stamped pipeline/screen …` (parágrafo **Resposta sem selo.**); com `APROVADO` e `<team.roles.ux>`, siga "Validação de UX".

## Validação de app

O critério está em `<crit>`, seção "PR de app"; aqui fica a mecânica. Sem `<team.devices>` → pare aqui, além do motivo registrado no roteamento.

1. Leia `<crit>`, seção "PR de app", e `.claude/skills/pipeline-maestro/reference/aparelhos.md`, seção "Roteiro de app", e siga os passos (ambiente, `build` ou bundler pelo `udid` de `## Decisões`, `launch`, ações por ref ou `testID`, digitação, `offline`/`online`, temas, efeito fora do app, selo).
2. Prepare o ambiente por "PR aberto pelo executor" e escreva o roteiro como nessa seção; o selo `<gate> stamp screen --pr <pr> --sha <sha> --evidence "<…>"` é o último passo, só no sucesso (com navegador e aparelho no PR, só no último roteiro).
3. Envie `maestri ask "<VAL-UI>" "<roteiro>"` e leia a resposta por `<roles>/validador-ui.md`, seção "Resposta". `TRAVADO` → resolva com o usuário e redespache a partir do passo; lista vazia ou erro ao abrir → apague os dados ou reinstale pelo `build` e redespache, sem achado.
4. Confira `stamped pipeline/screen …` (parágrafo **Resposta sem selo.**); com `APROVADO` e `<team.roles.ux>`, siga "Validação de UX", com as capturas do app.

## Validação de UX

Régua: `.claude/skills/pipeline-maestro/roles/ux.md`; critério: `<crit>`, seção "Nota de UX"; irmãs e conferência: `.claude/pipeline/core/ux-reference.md`. Leia `.claude/skills/pipeline-maestro/reference/validacao-ux.md`, seção "Passos" (1 a 12), e siga os passos. Sem `<team.roles.ux>` → pule esta seção.

1. Confira o roteiro de tela ou app `APROVADO` e `pipeline/ux` no `check`.
2. Reúna as capturas (tela web: as do executor, com novo pedido na rodada `k` se voltou da "Conferência do `PRONTO`"; app: roteiro fechado ao `<VAL-UI>`, um aparelho × claro/escuro) e as irmãs de `<team.roles.ux.siblings>`; envie `maestri ask "<UX>"` com PR/branch/SHA, descrição de cada tela, irmãs como referência e, só no `PRONTO`, `<gate> stamp ux --pr <pr> --sha <sha> --evidence "<…>"` (passos 2 a 5 do detalhe).
3. Registre `UX: MÉDIA <n>/10 — PRONTO|AJUSTAR (rodada <k>)` (última linha `MÉDIA …`) no item do PR. Antes de devolver cada `[BLOQUEIA]`, abra a captura; sem suporte na imagem, descarte e registre; captura que contradiz comportamento → parágrafo **Artefato do portal.** de "Validação de tela".
4. `AJUSTAR` → executor reiniciado pelo maestro (passo 5 de "Fila e despacho") como `REPROVADO`, com `[BLOQUEIA]` conferidos, `volta <k> da tela <rota>` e o pedido de sugestões futuras; revalidação parcial de "Achado do validador", passo 3, com pedido de capturas só das telas com `AJUSTAR` (rodada `k`). `[MELHORIA]` e decisão do solicitante: `<crit>`, seção "Nota de UX".
5. `PRONTO` sem `stamped pipeline/ux …`, ou com erro → pare e pergunte ao humano; nunca grave no lugar da UX.
6. Faça "Conferência do `PRONTO`" antes de aceitar; aceito e `check --pr <pr>` saindo 0 → "PR validado". Nenhum arquivo além das capturas na pasta ignorada pelo git.

### Conferência do `PRONTO`

1. Abra uma a uma todas as capturas das telas do PR na rodada final, todas as variantes (`Read`, no Claude Code); irmãs não contam. Registre `capturas conferidas pelo maestro: <q> arquivos (rodada <k>)` no item do PR.
2. Captura cortada, tela errada, variante faltando ou divergência das irmãs não vista pela UX → recuse: registre `PRONTO da UX recusado pelo maestro: <motivo> — o selo pipeline/ux de <sha curto> não vale`; não mova a `## Pronto para merge` nem notifique; refaça captura e rodada desde o passo 2 de "Validação de UX" ou devolva código como `AJUSTAR`. Não há revogação de selo (`.claude/pipeline/core/ux-reference.md`, seção "O selo `pipeline/ux`").

## Nota de estado

1. Crie com `--name` estável; preserve os títulos `## Fila`, `## Em execução`, `## Em validação`, `## Pronto para merge`, `## Decisões`.
2. `maestri note edit` para mudança pontual; `note write` só para reescrever inteira, preservando a primeira linha (`.claude/skills/pipeline-maestro/reference/armadilhas.md`, seção "Nota e recursos do Maestri").
3. Cada item em uma linha: `#<n> <título> — PR #<pr> — <estado> — <última evidência> — <AAAA-MM-DD>` (sem PR, `PR —`).
4. Item com tela leva `UX: …` e `capturas conferidas pelo maestro: …`; com reserva, quem validou.
5. Registre em `## Decisões` o slug do tenant de teste e toda decisão do usuário, com data.
6. A linha `PR #<pr> aberto para #<n>: <url> — <AAAA-MM-DD>` em `## Em execução` é o registro provisório do sentinela, trocada no `PILHA PRONTA` pelo item do passo 3.
7. Conte nos itens do PR as voltas pós-PR de cada tela (`REPROVADO`, `AJUSTAR`, review humano); só achado de tela tem volta (PR só de API não tem). Toda correção mandada ao executor diz `volta <k> da tela <rota>`.
8. A sessão compacta no `CLAUDE_CODE_AUTO_COMPACT_WINDOW` que o install põe em `.claude/settings.json` (`.claude/skills/pipeline-doctor/SKILL.md`, item 28), e o gancho `resume` aponta a nota depois da compactação; ao fim de cada pilha, deixe a nota em dia para retomar numa sessão nova se a compactação perder o fio.

## Recursos do Maestri

**(a)** `maestri routine create "Fila Ready do board" …` (nunca `routines`; atualiza a `## Fila`, nunca despacha). **(b)** `maestri notify` só com a pilha pronta ou executor pedindo decisão, até 500 caracteres. **(c)** Roteiro de celular: `maestri portal info`, `resize "<portal>" 390 844`, `ua "<portal>" ios`; ao fim, `ua "<portal>" desktop` e o resize guardado.
Leia `.claude/skills/pipeline-maestro/reference/armadilhas.md`, seção "Recursos do Maestri: itens (a), (b) e (c)", e siga os passos.

## Armadilhas

Detalhe: `.claude/skills/pipeline-maestro/reference/armadilhas.md`; selo que falhou: parágrafo **Selo que falhou** de `.claude/pipeline/core/seals-reference.md`, seção "Roteamento do maestro".
