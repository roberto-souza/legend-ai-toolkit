# Armadilhas do maestro

## Terminais e papéis

- **Preset de Claude Code em outro modelo.** O cabeçalho mostra modelo diferente do declarado. O executor sobe com `--command` explícito; o maestro confere o cabeçalho.
- **`--role` perde o contexto do projeto.** Claude Code abre no diretório do papel (`.maestri/roles/<id>/`) e perde settings e skills: o terminal não enxerga `pipeline-*`. O executor usa `--dir`, sem `--role`, e recebe o papel por mensagem.
- **Validador Claude Code sem `--setting-sources ''` herda ou perde o settings do projeto conforme o `--dir`.** Na raiz do checkout, o terminal herda o `.claude/settings.local.json` da máquina (as permissões liberadas ao maestro, inclusive merge e edição de PR) e os ganchos do `.claude/settings.json`, entre eles o que grava a autorização de merge a partir do prompt, que passaria a valer para mensagem de agente. Fora da raiz (a UX, na pasta das capturas), o terminal não carrega o settings do projeto, pelo mesmo mecanismo da armadilha do `--role`, e perde as permissões dele. O settings do usuário também fica de fora, porque um gancho do usuário que reescreve o comando Bash fura o `--allowedTools` (o comando reescrito passa sem aprovação). Saída: o `command` de todo validador Claude Code leva `--setting-sources ''` antes do `--allowedTools`; assim a permissão é só o `--allowedTools` do comando, igual em qualquer diretório, e por isso a regra do selo usa caminho absoluto. Sintoma de comando que ficou fora da lista: o roteiro para pedindo aprovação no terminal.
- **O Claude Code pede aprovação para `find … -delete`, `$(…)` e glob em comando que escreve ou apaga, qualquer que seja o `--allowedTools`.** O redirecionamento `> arquivo` só passa com a regra `Edit(/<caminho absoluto>/**)` da pasta, com a barra extra do caminho absoluto. Saída: o roteiro E2E segue a forma de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Validação de API por E2E", e o validador Claude Code que roda E2E leva a regra `Edit` da pasta do E2E. Regra de `Bash` com `*` não limita os argumentos (`rm`/`cp` com caminho extra passam), e `Edit(...)` não cobre `rm`/`cp`/`mkdir`; por isso o validador não recebe `rm`, e a limpeza é do maestro.
- **Help de `maestri recruit --replace` só documenta `--preset`.** Pode recusar `--command`/`--dir` ou subir fora da raiz do clone. Saída: `maestri dismiss`, novo recruit com `--command`/`--dir` e `maestri connect` para refazer as conexões, inclusive a nota quando couber.
- **Primeiro prompt em pasta ainda não confiada pede "trust this folder".** Acontece no `agy` e no Claude Code: o terminal fica parado sem responder. Saída: `maestri ask "<terminal>" --raw "\n"`.
- **Sandbox de escrita do Codex deixa `.git` só leitura, mesmo com `--add-dir`.** O validador falha ao trocar de branch. O maestro faz fetch e switch no checkout principal antes do roteiro.

## Ambiente de dev

- **Pré-requisito de `<team.dev.infraRequires>` ausente.** A API não sobe, login e página inicial quebram; é ambiente. O maestro confere o pré-requisito antes do roteiro.
- **Servidor do executor no clone.** `<team.dev.up>` colide com a porta do checkout principal: porta ocupada ou checkout principal cai. Só o maestro sobe o ambiente principal; o aparelho também é dele, por isso o executor não sobe bundler nem builda o app no clone. Exceção: o build do front que o executor serve numa porta livre, fora das portas de `<team.portals>`, só durante o pedido de capturas, não é `<team.dev.up>` e não colide com o checkout principal. Detalhe: `.claude/skills/pipeline-maestro/reference/captura.md`, seção "Captura pelo script".
- **Extensão nova do Postgres ausente no volume existente.** O init só roda com volume vazio; a rota responde 500 no E2E mesmo na branch certa com migration aplicada. O maestro usa o comando de banco de dev do `README.md` para rodar o mesmo `CREATE EXTENSION` da documentação de produção, antes do E2E; nunca o comando de produção.

## Nota e recursos do Maestri

- **`maestri note write` renomeia pela primeira linha.** A nota some do nome esperado. A primeira linha é preservada na reescrita completa; mudança pontual usa `note edit`.
- **`maestri routines` não existe.** Comando desconhecido; o nome é `maestri routine`.
- **`maestri notify` aceita até 500 caracteres.** Mensagem maior é recusada; a saída é resumir.
- **Tela guarda linha antiga.** `maestri check` mostra linhas velhas: sem a linha de base, uma correção reporta de novo o `PILHA PRONTA` anterior; a deduplicação é pela contagem de ocorrências contra a leitura anterior, então a correção que repete o mesmo texto de `PILHA PRONTA` ainda é reportada. A linha de base também engole qualquer linha impressa antes do arme (o `maestri ask` volta quando o executor termina o turno), por isso a olhada na tela antes de todo arme. Diff dos docs do pipeline na tela traz os mesmos tokens, por isso o casamento ancorado no começo da linha.
- **`maestri check` em laço na sessão.** Cada leitura é um turno que relê o contexto do maestro; a leitura periódica é do script.

## Portal

- **Portal não escolhe arquivo do disco.** O seletor não abre ou não aceita caminho. O upload usa `maestri portal evaluate` com `fetch` para a rota da API (proxy do front quando houver), base64 convertido em `Blob` dentro de `FormData`.

## Selos

Detalhe: parágrafo **Selo que falhou** de `.claude/pipeline/core/seals-reference.md`, seção "Roteamento do maestro".

## Recursos do Maestri: itens (a), (b) e (c)

Passos de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Recursos do Maestri":

1. **(a)** Crie no terminal do maestro `maestri routine create "Fila Ready do board" --weekly mon,tue,wed,thu,fri@08:30 --pre-run "<comando gh que lista a coluna Ready>" --command "Atualize a seção ## Fila da nota <team.note> com esta leitura do board, conferindo blockers, sem despachar: {{output}}"`, usando a leitura de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Fila e despacho"; nunca `routines`, nunca despacho pela rotina. Detalhe: `.claude/skills/pipeline-maestro/reference/armadilhas.md`, seção "Nota e recursos do Maestri".
2. **(b)** Use `maestri notify` só com a pilha pronta para merge ou executor parado pedindo decisão → acima de 500 caracteres, resuma. Detalhe: `.claude/skills/pipeline-maestro/reference/armadilhas.md`, seção "Nota e recursos do Maestri".
3. **(c)** No roteiro de celular do validador de tela, comece com `maestri portal info "<portal>"` (guarde tamanho), `maestri portal resize "<portal>" 390 844`, `maestri portal ua "<portal>" ios`; termine com `maestri portal ua "<portal>" desktop` e resize ao tamanho guardado.
