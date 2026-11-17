# Validação de UX: passos

## Passos

Passos completos de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Validação de UX", com os nomes completos dos terminais (`[EXECUTOR] <team.roles.executor.tool>` etc.), `<raiz>` o checkout principal e `<gate>` o `node <raiz>/.claude/pipeline/core/pipeline-gate.mjs`.

Régua: `.claude/skills/pipeline-maestro/roles/ux.md`; critério: `<knowledge.verification>`, seção "Nota de UX"; chaves: `.claude/pipeline/core/profile-schema.md`, seção "`team`"; irmãs e conferência: `.claude/pipeline/core/ux-reference.md`.

1. Confira a aplicação: roteiro de tela ou app `APROVADO` e linha `pipeline/ux` no `check`. Sem `<team.roles.ux>` → pule esta seção, além da nota do setup.
2. Tela web: as capturas são as da varredura e das irmãs que o executor gravou na pasta da rodada (passo 3 de `.claude/skills/pipeline-maestro/reference/validacao-tela.md`, seção "Passos"), sem roteiro novo; voltando a este passo pela "Conferência do `PRONTO`" (mesmo SHA), mande novo pedido de capturas (passo 3 de "Validação de tela") na rodada `k`, e o `CAPTURAS PRONTAS` segue o passo 4 de lá. App: escreva roteiro fechado de capturas para `[VALIDADOR UI] <team.roles.validatorUi.tool>`, com PR, branch e SHA: um aparelho por `<team.devices>` × claro/escuro; troca de tema pelo controle nomeado. Detalhe: `.claude/skills/pipeline-maestro/reference/captura.md`.
3. Só app. Em cada captura, escreva `maestri portal evaluate "<portal>" "document.getAnimations().forEach(a => a.finish())"`, `maestri portal screenshot`, `mkdir -p` e `cp` para `<raiz do checkout principal>/<team.roles.ux.dir>/pr-<n>/`, com o nome `<tela>-<name do aparelho em kebab-case>-<claro|escuro>.png`; `<tela>` dado pelo maestro em kebab-case, rodada `k` ≥ 2 em `.../pr-<n>/rodada-<k>/`. → animação congelada: pare e trate o artefato. Detalhe: `.claude/skills/pipeline-maestro/reference/captura.md`, seção "Artefato do portal".
4. Só app. Com `<team.roles.ux.siblings>`, acrescente ao mesmo roteiro as irmãs do mesmo `app`/`pattern` (sem pattern parecido, todas); exclua telas do PR, deduplique, resolva `:<param>` por id real do tenant; mesmas variantes em `.../pr-<n>/irmas/<name>-<variante>.png` (rodada ≥ 2 em `.../pr-<n>/rodada-<k>/irmas/`). Detalhe: `.claude/pipeline/core/ux-reference.md`, seção "Seleção das irmãs".
5. Envie `maestri ask "[UX] <team.roles.ux.tool>" "<mensagem>"`: PR/branch/SHA, descrição de cada tela (tarefa, público, ação primária, decisões do solicitante), caminhos do PR, irmãs em bloco separado de referência sem nota com `name`/`route`/`pattern` (sem irmãs: `sem telas irmãs declaradas para <app>`); quando `<team.roles.ux.audience>` descreve públicos diferentes por front, diga qual é o público do front da tela, e tela de front que a audiência declara mobile-first: a mensagem lista primeiro as capturas do celular e diz que o celular é o uso principal; passo só no `PRONTO`: `node <raiz do checkout principal>/.claude/pipeline/core/pipeline-gate.mjs stamp ux --pr <pr> --sha <sha> --evidence "<…>"`.
6. Leia a última linha `MÉDIA <n>/10 — PRONTO|AJUSTAR`; registre `UX: MÉDIA <n>/10 — PRONTO|AJUSTAR (rodada <k>)` no item do PR.
7. Antes de devolver cada `[BLOQUEIA]`, abra a captura; sem suporte na imagem, descarte e registre. Captura contradiz comportamento → parágrafo **Artefato do portal.** de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Validação de tela".
8. `AJUSTAR` → executor reiniciado pelo maestro (passo 5 de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Fila e despacho") como `REPROVADO`, com `[BLOQUEIA]` conferidos, `volta <k> da tela <rota>` e pedido da seção de sugestões futuras com o título do critério; tome o SHA novo e faça a revalidação parcial de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Achado do validador", passo 3, com o pedido de capturas só das telas com `AJUSTAR` na rodada `k`; volte ao passo 2 em `rodada-<k>/` só com essas telas, sem pedido novo. `[MELHORIA]` e decisão do solicitante: `<knowledge.verification>`, seção "Nota de UX".
9. `PRONTO` sem `stamped pipeline/ux …`, ou com erro → pare e pergunte ao humano; nunca grave no lugar da UX. Detalhe: parágrafo **Selo que falhou** de `.claude/pipeline/core/seals-reference.md`, seção "Roteamento do maestro".
10. Faça `.claude/skills/pipeline-maestro/SKILL.md`, seção "Conferência do `PRONTO`", antes de aceitar.
11. Aceito e `check --pr <pr>` saindo 0 → `.claude/skills/pipeline-maestro/SKILL.md`, seção "PR validado"; merge só com todas as telas da pilha em `PRONTO` aceito, `.claude/skills/pipeline-maestro/SKILL.md`, seção "Merge".
12. Não crie arquivo além das capturas na pasta ignorada pelo git.

## Leitura única

Só com `team.capture` no profile e na parte web do PR. A UX lê cada captura uma vez, com o `medidas.json`, e emite dois laudos: o de tela e o de UX. Sem `team.capture`, vale "Passos": dois leitores, o validador de tela e a UX. Motivo: `.claude/pipeline/core/ux-reference.md`, seção "Uma leitura, dois laudos".

1. Confira: `medidas.json` sem cenário em `FALHA` e os passos pontuais `APROVADO` ou ausentes (passos 5 e 6 de `.claude/skills/pipeline-maestro/reference/validacao-tela.md`, seção "Passos com a ferramenta").
2. Envie `maestri ask "[UX] <team.roles.ux.tool>" "<mensagem>"`, com:
   - PR, branch, SHA e a instrução de seguir `.claude/skills/pipeline-maestro/roles/ux.md`, seção "Leitura única";
   - um passo numerado por cenário de `medidas.json` (irmã não entra), com o caminho da captura, o `kind`, o `ref`, a evidência esperada, cada medida com valor, limite e resultado, e o console; os passos pontuais aprovados, com a captura e a linha da nota;
   - a descrição de cada tela e as irmãs, como no passo 5 de "Passos";
   - dois comandos de selo, cada um para uma chamada sozinha: `node <raiz do checkout principal>/.claude/pipeline/core/pipeline-gate.mjs stamp screen --pr <pr> --sha <sha> --evidence "<…>"`, só no `APROVADO` e só quando não vem roteiro de app depois; e `node <raiz do checkout principal>/.claude/pipeline/core/pipeline-gate.mjs stamp ux --pr <pr> --sha <sha> --evidence "<…>"`, só com `APROVADO` e `PRONTO`.
3. Leia a resposta por `.claude/skills/pipeline-maestro/roles/ux.md`, seção "Leitura única": a linha do laudo de tela, o laudo de UX e a última linha `MÉDIA …`. Registre `UX: MÉDIA <n>/10 — PRONTO|AJUSTAR (rodada <k>)` no item do PR.
4. `REPROVADO` → `.claude/skills/pipeline-maestro/SKILL.md`, seção "Achado do validador"; com `AJUSTAR` na mesma resposta, uma correção só ao executor, com os passos reprovados e os `[BLOQUEIA]` conferidos (passo 7 de "Passos").
5. `APROVADO` sem `stamped pipeline/screen …`, ou `PRONTO` sem `stamped pipeline/ux …`, ou com erro → pare e pergunte ao humano: parágrafo **Resposta sem selo.** de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Roteamento por tipo de PR".
6. PR com navegador e app: a leitura única não grava `screen`, que sai do roteiro de app, e o `ux` só sai depois da leitura das capturas do app (passos 2 a 5 de "Passos").
7. `APROVADO` e `PRONTO` → `.claude/skills/pipeline-maestro/SKILL.md`, seção "Conferência do `PRONTO`", na forma com a ferramenta.
8. Revalidação depois de correção: pedido de capturas pela ferramenta das telas com `REPROVADO` ou `AJUSTAR`, mais uma tela aprovada como smoke, na rodada `k`; leitura única dessas telas, com os dois selos no SHA novo.
9. Não crie arquivo na pasta além das capturas e dos arquivos da ferramenta (`cenarios.json`, `capturas.md`, `medidas.json`).
