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

Os itens 3–6 e as linhas marcadas `(Passo 2)` dos itens 23, 24 e 27 rodam as recusas de `.claude/skills/pipeline-project-profile/SKILL.md`, seção "Passo 2 — Conferir", sem parar nelas: cada recusa é `FALHA` que nomeia a chave e nunca repete o valor.

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
    falta é `FALHA` (e o `AVISO` do ilustrador) com a chave ou o arquivo, nunca o valor:
    - (Passo 2) as recusas de `team`, `team.e2e` (inclusive `login.signCommand` sem `{bodyFile}`), `team.devices` e
      `team.roles.ux.siblings`, inclusive `team.roles.illustrator` sem `command`, `knowledge.verification` ausente,
      `team.roles.validator` presente ("chave renomeada para validatorApi (profileVersion 2)") e `team.credentials.*`
      com cara de segredo;
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
      `team.roles.ux.siblings` "UX sem telas irmãs"; sem `team.roles.illustrator` "sem ilustrador no Maestri";
    - `team.roles.illustrator` declarado sem `landing:` no profile → `AVISO` "ilustrador sem módulo de landing; ninguém o
      recruta".
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
26. **Toolkit.** `.claude/pipeline/toolkit.lock` ausente → `AVISO` ("core copiado à mão; instale pelo prompt 01-instalar do Legend AI Toolkit"). Presente: `node .claude/pipeline/core/verify.mjs` sai 0 → `OK` com a versão; senão `FALHA` com os arquivos que ele lista e a ação "desfaça a edição local ou leve a mudança ao toolkit e reinstale pelo prompt 02-atualizar". Gate: leia o comando de `<gate.final>` e, a cada script do projeto que ele chama (por exemplo, `scripts` do `package.json`), o comando desse script, até achar `verify.mjs` → `OK`; senão `AVISO` ("ponha o `verify.mjs` no gate").
27. **Landing (`landing`).** Sem `landing:` no profile → `OK`, com a nota "módulo de landing desligado". Com `landing:`,
    `FALHA` e `AVISO` nomeiam a chave ou o arquivo:
    - (Passo 2) as recusas de `landing`;
    - extensão `landing.md` ausente em `.claude/pipeline` → `FALHA`, ação "criar pelo template `landing.md` do toolkit e
      preencher"; presente, cada um dos sete títulos (`## Produto`, `## Público`, `## Ação`, `## Proibições`, `## Fontes`,
      `## Hospedagem`, `## Descoberta`) que falta → `FALHA` com o título;
    - `landing.md` com `<...>` do template ainda sem preencher fora de `## Descoberta` → `AVISO` com as linhas; `## Descoberta`
      sem nenhum rótulo `- **<Rótulo>:**` (só o placeholder) → `OK` com a nota "descoberta ainda não feita"; com rótulos, cada
      rótulo do checklist de descoberta que falta → `AVISO` com os rótulos (a descoberta se faz aos poucos); os 15 → `OK`;
    - `<landing.app>` ou `<landing.handoff>` inexistente → `AVISO` ("o fluxo de landing cria"); `<landing.taste>` por
      caminho inexistente → `FALHA`;
    - os modelos de `.claude/pipeline/core/landing/` que a skill copia ou lê (briefing, validacao, manifesto, contexto-tickets,
      descoberta, taste, rubrica) existem → senão `FALHA` com os nomes, ação "reinstale pelo prompt 02-atualizar"; com
      `landing.taste: default`, é o `taste` do core que vale, e a mesma checagem o cobre;
    - skill do módulo: `.claude/skills/pipeline-landing/SKILL.md` com `model:` no frontmatter,
      `.claude/skills/pipeline-landing-flow/SKILL.md` com `disable-model-invocation: true` e `## Entrada`, os três arquivos de
      `reference/` dela e os sete agentes `pipeline-landing-*` existem → senão `FALHA` com o arquivo, ação "reinstale pelo
      prompt 02-atualizar"; os dois `ilustrador.md` do `pipeline-maestro` ausentes → `FALHA`, a mesma ação;
    - com `team:` e sem `team.roles.illustrator` → `AVISO` "sem ilustrador no time: a fase de teste de estilo fica com o
      solicitante";
    - nota `OK`: handoff ignorado pelo git ou versionado.

    Comandos, da raiz do repositório (bash):

    ```bash
    L=.claude/pipeline/landing.md
    if test -f "$L"; then
      for t in Produto Público Ação Proibições Fontes Hospedagem Descoberta; do grep -qx "## $t" "$L" || echo "FALHA landing.md sem ## $t"; done
      awk '/^## /{d=($0=="## Descoberta")} !d && /<[^>]*>/{print "AVISO "FILENAME":"FNR": "$0}' "$L"
      D=$(awk '/^## /{d=($0=="## Descoberta"); next} d' "$L")
      if ! printf '%s\n' "$D" | grep -q '^- \*\*[^*]*:\*\*'; then echo "OK descoberta ainda não feita"; else
        for r in Domínio Deploy Stack Spec Guardas Segurança Privacidade Medição Bots Marca Convenções Segredos Conta Toolchain Redirecionamentos; do
          printf '%s\n' "$D" | grep -q "^- \*\*$r:\*\*" || echo "AVISO descoberta sem o rótulo $r"
        done
      fi
    else echo "FALHA landing.md ausente"; fi
    test -d "<landing.app>" || echo "AVISO <landing.app> não existe"; test -d "<landing.handoff>" || echo "AVISO <landing.handoff> não existe"
    for f in .claude/pipeline/core/landing/{briefing,validacao,manifesto,contexto-tickets,descoberta,taste,rubrica}.md \
      .claude/skills/pipeline-landing-flow/SKILL.md .claude/skills/pipeline-landing-flow/reference/{portoes,pagina-construida,armadilhas}.md \
      .claude/agents/pipeline-landing-{researcher,domain-researcher,seo,teardown,copywriter,designer,validator}.md \
      .claude/skills/pipeline-maestro/{roles,reference}/ilustrador.md; do test -f "$f" || echo "FALHA $f ausente"; done
    test -f .claude/skills/pipeline-landing/SKILL.md || echo "FALHA skill pipeline-landing ausente"
    grep -L '^model:' .claude/skills/pipeline-landing/SKILL.md
    grep -L '^disable-model-invocation: true' .claude/skills/pipeline-landing-flow/SKILL.md
    grep -L '^## Entrada' .claude/skills/pipeline-landing-flow/SKILL.md
    case "<landing.taste>" in ""|default) ;; *) test -f "<landing.taste>" || echo "FALHA landing.taste: <landing.taste> não existe" ;; esac
    git check-ignore -q "<landing.handoff>/" && echo "handoff ignorado pelo git" || echo "handoff versionado"
    ```
28. **Contexto.** Regra: `.claude/pipeline/core/profile-schema.md`, seção "O que o install põe no `settings.json`".
    `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW` ausente (ou `.claude/settings.json` ausente) → `AVISO`, ação "reinstale pelo
    prompt 02-atualizar"; presente → `OK` com o valor (o do projeto vale, mesmo diferente de 250000). `settings.json` que
    não é JSON válido → `FALHA`, ação "corrija o JSON". Sem `team:` no profile, o gancho não é cobrado. Com `team:`, sem
    `hooks.SessionStart` de matcher `compact` chamando `pipeline-gate.mjs resume` → `FALHA`, ação "reinstale pelo prompt
    02-atualizar". Comando, da raiz do repositório (bash):

    ```bash
    node -e '
    const fs = require("fs");
    const file = ".claude/settings.json";
    let s = {};
    try { s = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {}; }
    catch { console.log("FALHA settings.json não é JSON válido"); process.exit(); }
    const env = s.env?.CLAUDE_CODE_AUTO_COMPACT_WINDOW;
    console.log(env == null ? "AVISO env ausente" : `OK env ${env}`);
    const hooks = Array.isArray(s.hooks?.SessionStart) ? s.hooks.SessionStart : [];
    const resume = hooks.some(e => e?.matcher === "compact" && e.hooks?.some?.(h => /pipeline-gate\.mjs"? resume$/.test(h?.command ?? "")));
    console.log(resume ? "OK gancho resume presente" : "gancho resume ausente (FALHA só com team:)");
    '
    ```
29. **Teto do arquivo de instruções.** Regra: `.claude/pipeline/core/format.md`, seção "Arquivo de instruções do projeto".
    Sem `knowledge.instructionsBudget` → `OK`, com a nota "sem teto declarado". Com a chave (valor que não é inteiro
    positivo já é recusa do item 6): `node .claude/pipeline/core/document-budget.mjs` sai 0 → `OK`; senão `FALHA` com a
    linha que ele imprime e a ação "mova histórico e detalhe para fora de `<knowledge.projectInstructions>`, deixando a regra
    em uma linha e o ponteiro".
    Gate: como no item 26, siga `<gate.final>` até achar `document-budget.mjs` → `OK`; senão `AVISO` ("ponha o
    `document-budget.mjs` no gate").
