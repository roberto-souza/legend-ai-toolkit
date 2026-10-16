---
name: pipeline-doctor
description: Confere se o pipeline está pronto neste repositório — core local, profile, remote, gh e board ao vivo
---

Rode o checklist abaixo **inteiro**, sem parar no primeiro erro, e sem alterar nenhum arquivo nem nada no GitHub. É
diagnóstico, só leitura.

Para cada item, registre `OK`, `FALHA` ou `AVISO`, com a evidência (saída do comando) e, na falha, **a ação** que resolve.
No fim, imprima a tabela `| # | Item | Estado | Evidência | Ação |` e uma linha: `DOCTOR: GREEN` quando nenhum item está
em `FALHA`, senão `DOCTOR: RED — <n> falhas`. `AVISO` não conta para o veredito; some os avisos na mesma linha
(`DOCTOR: GREEN — 1 aviso`).

O schema de referência é `.claude/pipeline/core/profile-schema.md`.

Os itens 3–6 e as linhas marcadas `(Passo 2)` dos itens 23 e 24 rodam as recusas de `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir", sem parar nelas: cada recusa é `FALHA` que nomeia a chave e nunca repete o valor.

1. **Core local.** Existem as sete `.claude/skills/pipeline-{project-profile,github-tickets,write-ticket,execute-ticket,review-diff,security-audit,maestro}/SKILL.md`,
   os quatro `.claude/skills/pipeline-maestro/roles/{executor,validador-api,validador-ui,ux}.md`, os quatro `.claude/agents/pipeline-{ticket-writer,implementer,reviewer,security-reviewer}.md` e os seis `.claude/pipeline/core/{principles,profile-schema,seals-reference,ux-reference,format,entrada}.md`.
   Liste o que falta.
2. **Profile existe.** `.claude/pipeline/profile.yml` na raiz do projeto (`${CLAUDE_PROJECT_DIR}`). Falha → criar pelo schema.
3. **`profileVersion` suportada** (Passo 2). Precisa ser `2`.
4. **Chaves obrigatórias** (Passo 2) presentes. Liste as que faltam.
5. **Valores reservados** (Passo 2; a lista está no schema e **hoje está vazia**) ausentes. Valor fora do conjunto
   suportado de uma chave também é `FALHA`.
6. **Combinações obrigatórias** (Passo 2: a tabela, e `topology: polyrepo` com `<repo>` em `workspace.repos`), cada uma `OK`
   ou `FALHA` com a chave que falta.
7. **Irmãos** (só com `topology: polyrepo`). Para cada item de `workspace.repos` que não é `<repo>`, confira o diretório
   (`dir`, ou o nome curto do repositório, relativo ao diretório-pai deste checkout) e o remote dele:
   ```bash
   git -C "../<dir>" remote get-url origin
   ```
   Remote bate com `repo` → `OK`. Diretório ausente → `AVISO` ("o clone do irmão não existe nesta máquina"). Diretório
   existe e o remote aponta para outro repositório → `FALHA`, com o valor vivo e a ação de corrigir `dir` no profile.
   Detalhe: `.claude/skills/pipeline-doctor/reference/polyrepo.md`, seção "Irmãos (item 7)".
8. **Workflow de fechamento** (só com `closing.mode: close-references-mutation`). O arquivo de `closing.workflow` existe →
   `OK`. Ausente → `FALHA`. Existindo, confira que ele reage a `pull_request` `closed` na `<branches.base>` — não reage →
   `AVISO`, com a linha do arquivo. Detalhe: `.claude/skills/pipeline-doctor/reference/polyrepo.md`, seção "Workflow de fechamento (item 8)".
9. **Remote.** `gh repo view --json nameWithOwner --jq .nameWithOwner` é igual a `repo`.
10. **Autenticação.** `gh auth status` logado e com scope `project` (só quando `board` não é `none`).
11. **Board ao vivo** (só quando `board` não é `none`):
    ```bash
    gh project view <board.number> --owner <board.owner> --format json --jq .id
    gh project field-list <board.number> --owner <board.owner> --format json \
      --jq '.fields[] | select(.name=="Status") | {id, options: [.options[] | {name, id}]}'
    ```
    `projectId`, `statusField` e os cinco option-ids do profile precisam bater com a resposta. Divergiu → mostre o valor
    vivo e diga para corrigir o profile.
12. **Tipos de issue.** Cada chave de `issues.types` existe entre os tipos habilitados de `<board.owner>`
    (`gh api /orgs/<board.owner>/issue-types --jq '.[] | select(.is_enabled) | .name'`). Owner que é usuário, não org → `AVISO`.
13. **Label.** `issues.label` existe em `gh label list`.
14. **Template.** `issues.template` existe.
15. **Stack skills.** Cada `knowledge.stackSkills[].skill`, pela forma do nome:
    - **local** (sem dois-pontos) → `.claude/skills/<skill>/SKILL.md` existe;
    - **namespaced** (`<plugin>:<skill>`) → o plugin está habilitado **para este projeto** — `enabledPlugins` em
      `.claude/settings.json`, `.claude/settings.local.json` ou `~/.claude/settings.json` —, e a skill existe nele. Não use
      `claude plugin list`. Plugin ausente ou desabilitado → `FALHA`, com a ação de instalar ou habilitar; o marketplace de
      origem é fato do projeto, não do core. Plugin presente e skill não listada nele → `FALHA`.

    Detalhe: `.claude/skills/pipeline-doctor/reference/falsos-positivos.md`, seção "Plugin habilitado em outro projeto (itens 15 e 20)".

16. **Conhecimento.** `knowledge.projectInstructions` existe; `knowledge.moduleMaps`, `knowledge.adrs` e
    `knowledge.memories`, quando declarados, existem. `knowledge.memories` declarado e arquivo ausente → `FALHA`, ação
    "criar o índice ou remover a chave".
17. **Extensões.** Informe quais de `rules.md` e `ticket.md` existem em `.claude/pipeline/`. Ausente → `AVISO` (a revisão
    perde as regras do repo; o ticket perde as regras de fatiamento). `knowledge.verification` declarado e arquivo ausente
    → `FALHA`, ação "criar o arquivo ou remover a chave"; chave ausente sem `team:` → `OK` (com `team:`, quem cobra é o item 23), com a nota "sem critério de verificação
    declarado".
18. **Security.** Com `security.diffGate` diferente de `false` (default): `.claude/pipeline/security.md` ausente → `FALHA`,
    ação "criar pelo schema, seção `security`"; `security.md` sem a seção `## Triggers` → `FALHA`; `security.baseline` ausente no
    profile, ou arquivo inexistente → `FALHA`. Com `security.diffGate: false` → `AVISO` "gate de segurança desligado neste
    repositório".
19. **Extensões sem follow-up.** Regra: `.claude/pipeline/core/principles.md`, seção "1. Regra do escoteiro (limitada)".
    Extensão que ainda manda abrir ticket durante a execução contradiz o core → `AVISO`, com as linhas:
    ```bash
    grep -niE 'follow-up|ticket companheiro|issue parentada|--parent|vira issue' .claude/pipeline/rules.md .claude/pipeline/ticket.md 2>/dev/null
    ```
    Ação: trocar a instrução por "corrige no mesmo PR e registra em `Also fixed`". O fatiamento planejado do `ticket.md`
    (aresta `Blocked by`, sub-issue por `--parent`) não conta. Nenhuma linha → `OK`. Detalhe: `.claude/skills/pipeline-doctor/reference/falsos-positivos.md`, seção "Fatiamento planejado (item 19)".
20. **Plugin antigo desligado.** O plugin `pipeline@agent-core` não pode estar habilitado aqui. **Não use
    `claude plugin list`**; leia só o que habilita plugin para esta pasta:
    ```bash
    grep -n 'agent-core' .claude/settings.json .claude/settings.local.json ~/.claude/settings.json 2>/dev/null
    ```
    Linha em `.claude/settings*.json` → `AVISO` "plugin ainda habilitado no projeto", ação: remover a entrada e rodar
    `claude plugin uninstall pipeline@agent-core --scope project`. Linha em `~/.claude/settings.json` → `AVISO` "habilitado
    no escopo user, carrega em todo projeto", ação: mover a habilitação para o settings do projeto que ainda usa o plugin.
    Nenhuma linha → `OK`. Plugin habilitado em outro projeto não conta.
    Detalhe: `.claude/skills/pipeline-doctor/reference/falsos-positivos.md`, seção "Plugin habilitado em outro projeto (itens 15 e 20)".
21. **Princípios do core copiados na extensão.** Regra: `.claude/pipeline/core/principles.md`, seção "O repositório ajusta a severidade, nunca o texto".
    `rules.md` que reescreve o texto de um princípio, em vez de só declarar outra severidade → `AVISO`, com as linhas:
    ```bash
    grep -niE 'DRY|KISS|YAGNI|escoteiro|duplica[çc]|abstra[çc][ãa]o prematura|padr[ãa]o inventado' .claude/pipeline/rules.md 2>/dev/null
    ```
    Ação: trocar a cópia por uma linha que **nomeie** o princípio e declare só a severidade. Não são cópia: linha que já é
    só severidade; regra ancorada num caminho deste repositório; a regra de estilo que alguns repositórios chamam de
    "regra do escoteiro" (arquivo tocado sai no padrão). Nenhuma linha, ou `rules.md` ausente → `OK`.
    Detalhe: `.claude/skills/pipeline-doctor/reference/falsos-positivos.md`, seção "O que o grep do item 21 pega e não é cópia".
22. **Comandos do pipeline são a porta de entrada.** Os comandos carregam o pin de modelo e apontam para o checklist;
    skill interna carregada direto pula o pin. A trava é frontmatter mais texto, e as cinco checagens rodam da raiz do
    repositório — qualquer saída é `FALHA`:
    ```bash
    grep -L '^model:' .claude/skills/pipeline-{ticket,execute,security}/SKILL.md
    grep -L '^disable-model-invocation: true' .claude/skills/pipeline-{write-ticket,execute-ticket}/SKILL.md
    grep -L '^## Entrada' .claude/skills/pipeline-{write-ticket,execute-ticket,security-audit}/SKILL.md
    awk 'FNR==1{n=0} /^---$/{n++; next} n==1 && /Use quando/{print FILENAME": "$0}' .claude/skills/pipeline-{write-ticket,execute-ticket,security-audit}/SKILL.md
    grep -nE 'Carregue.*pipeline-(write-ticket|execute-ticket)' .claude/skills/pipeline-{ticket,execute}/SKILL.md
    ```
    `FALHA` com o arquivo (e a linha, nos dois últimos) como evidência. Ação: comando sem `model:` → restaurar o pin;
    skill interna sem `disable-model-invocation: true` → acrescentar ao frontmatter; sem `## Entrada` → acrescentar como
    primeira seção; `Use quando` no frontmatter → mover a frase para a `description` do comando dono; comando que manda
    carregar a skill interna → trocar por leitura do caminho `.claude/skills/<skill>/SKILL.md`. Nenhuma saída → `OK`.
23. **Time (`team`).** Sem `team:` no profile → `OK`, com a nota "repositório sem orquestração de time". Com `team:`, cada
    falta é `FALHA` com a chave ou o arquivo, nunca o valor:
    - (Passo 2) as recusas de `team`, `team.e2e` (inclusive `login.signCommand` sem `{bodyFile}`), `team.devices` e
      `team.roles.ux.siblings`, inclusive `knowledge.verification` ausente, `team.roles.validator` presente ("chave
      renomeada para validatorApi (profileVersion 2)") e `team.credentials.*` com cara de segredo;
    - `knowledge.verification` ausente, ou com o arquivo ausente → `FALHA` "a orquestração do time exige
      `knowledge.verification`";
    - `<team.credentials.file>.example` existe → inexistente, `FALHA` "sem arquivo de exemplo para conferir as variáveis";
    - cada item de `team.credentials.keys` e cada variável de `team.e2e.users.*.credentials` existe no arquivo de exemplo →
      ausente, `FALHA` "variável sem entrada no `<team.credentials.file>.example`":
      ```bash
      grep -E '^<KEY>=' <team.credentials.file>.example
      ```
    - cada variável de `team.e2e.users.*.credentials` consta em `team.credentials.keys` → ausente, `FALHA` "credencial do
      E2E fora de `team.credentials.keys`";
    - está ignorado pelo git (`git check-ignore -q <caminho>`) → senão `FALHA`: `<team.credentials.file>` "o arquivo de
      credencial seria versionado"; `.maestri/e2e/`, com `team.e2e`, "a pasta de arquivos temporários do E2E seria
      versionada (o corpo do login guarda a senha)"; `<team.roles.ux.dir>`, com `team.roles.ux`, "a pasta de capturas seria
      versionada";
    - cada `team.portals[].url` começa com `http://` ou `https://` (o placeholder `{slug}` é permitido) → senão `FALHA`,
      com a URL;
    - notas `OK`: sem `team.e2e` "sem validação de API por E2E"; sem `team.devices` "sem validação de app"; aparelho sem
      `offline` "cenário offline sem corte de rede em <name>"; sem `team.roles.ux` "sem validação de UX"; sem
      `team.roles.ux.siblings` "UX sem telas irmãs".
24. **Selos (`seals`).** `FALHA` com a ação se faltar: `.claude/pipeline/core/seals.md` e `pipeline-gate.mjs`; em
    `.claude/settings.json`, `hooks.PreToolUse` com `Bash` e com `Write|Edit|MultiEdit|NotebookEdit` chamando
    `pipeline-gate.mjs hook`, e `hooks.UserPromptSubmit` chamando `authorize`; `node -e "import('yaml')"` resolvendo;
    `echo '{"tool_input":{"command":"ls"}}' | node .claude/pipeline/core/pipeline-gate.mjs hook` e `echo null | node .claude/pipeline/core/pipeline-gate.mjs hook` saindo 0, e um comando com `gh pr` e `merge` fora da forma permitida saindo 2 (prova que o CLI roda); `carry` listado no uso do script. Com `team:` e sem
    `seals.kinds` → "a orquestração do time exige `seals.kinds`"; com `seals`, as recusas de `seals` (Passo 2).
25. **Formato (checklist + ponteiros).** (a) Todo ponteiro canônico (`.claude/pipeline/core/format.md`, seção "Ponteiro") dentro de `.claude/skills/pipeline-*/`, `.claude/agents/pipeline-*.md` e `.claude/pipeline/` resolve: o arquivo existe e, com `, seção "<título>"`, o arquivo tem uma linha de cabeçalho cujo texto, depois dos `#` iniciais e de um espaço, é igual ao título → senão `FALHA` com `arquivo:linha`; (b) arquivo principal acima de 150 linhas → `AVISO` com a contagem. O `AVISO` do teto aparece nos arquivos ainda não convertidos e não muda o veredito `GREEN`. Ação para (a): corrigir o caminho ou o título, ou restaurar a seção. Comandos, da raiz do repositório (bash):

    ```bash
    grep -rnoE '`[^`[:space:]<>*{}]+\.md`(, seção "[^"]+")?' .claude/skills/pipeline-*/ .claude/agents/pipeline-*.md .claude/pipeline/ |
    while IFS= read -r hit; do
      loc=${hit%%:\`*}; ptr=${hit#"$loc":}
      path=$(printf '%s\n' "$ptr" | sed -E 's/^`([^`]+)`.*/\1/')
      title=$(printf '%s\n' "$ptr" | sed -nE 's/^`[^`]+`, seção "(.*)"$/\1/p')
      case "$path" in */*) ;; *) [ -n "$title" ] || continue ;; esac
      [ -f "$path" ] || { echo "FALHA $loc: $path não existe"; continue; }
      [ -z "$title" ] || grep -E '^#+ ' "$path" | sed -E 's/^#+ //' | grep -qxF "$title" || echo "FALHA $loc: $path sem a seção \"$title\""
    done
    for f in .claude/skills/pipeline-*/SKILL.md .claude/agents/pipeline-*.md .claude/skills/pipeline-maestro/roles/*.md; do
      n=$(wc -l < "$f" | tr -d ' '); [ "$n" -le 150 ] || echo "AVISO $f: $n linhas"
    done
    ```

    Nenhuma linha `FALHA` → (a) `OK`.
26. **Toolkit.** `.claude/pipeline/toolkit.lock` ausente → `AVISO` ("core copiado à mão; instale pelo Legend AI Toolkit, `prompts/01-instalar.md`"). Presente: `node .claude/pipeline/core/verify.mjs` sai 0 → `OK` com a versão; senão `FALHA` com os arquivos que ele lista e a ação "desfaça a edição local ou leve a mudança ao toolkit e reinstale pelo `prompts/02-atualizar.md`". O `<gate.final>` roda o `verify.mjs`, direto ou por um script do projeto → senão `AVISO` ("ponha o `verify.mjs` no gate").
