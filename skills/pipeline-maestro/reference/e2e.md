# E2E de API

## Arquivos temporários

Cada rodada tem a pasta `<raiz do checkout principal>/.maestri/e2e/pr<pr>/`, com `<papel>.cookies`, `<papel>.login.out`, `<papel>.<nome da credencial>` e, no login assinado, `<papel>.body.json` e `<papel>.headers`. A pasta precisa continuar ignorada pelo git: os arquivos de credencial e o corpo do login guardam segredo.

O maestro apaga e cria a pasta (`rm -rf`, depois `mkdir -p`) antes de despachar e a apaga depois de cada resposta; o validador não apaga nada, porque a regra de permissão de `rm` não limita os argumentos.

## Login assinado

Os três comandos (corpo por `jq -n --rawfile …`, com cada credencial entrando como `($<nome> | rtrimstr("\n"))`, porque o `grep | cut >` grava o `\n` final e a senha sairia com ele, assinatura e envio) ficam numa linha de shell com `&&`, para nada rodar entre assinar e enviar. `{bodyFile}` é absoluto, porque o comando de assinatura pode rodar em outro diretório. `--data-binary @file` envia os bytes assinados; `-d` com string os recodifica.

O login é novo a cada rodada porque jar reaproveitado devolve 401 depois de `migrate` ou `seed`. O `{slug}` vem do papel, não de `## Decisões`, e a credencial vai do arquivo de credencial ao arquivo da rodada por `grep | cut >`, e o curl (ou o `jq`) a lê do arquivo; ela não chega a roteiro, nota nem resposta. Passos: `.claude/skills/pipeline-maestro/SKILL.md`, seção "Validação de API por E2E".

Sem `-v`/`--trace` e com `-sS -o …login.out -w '%{http_code}'`, o corpo e o cookie não chegam à saída. As proibições do validador vivem em `.claude/skills/pipeline-maestro/roles/validador-api.md`, seção "Proibições".

## Nome único por rodada

O sufixo `e2e-<pr>-<epoch>`, com o epoch literal que o maestro escreve a cada rodada, impede que a segunda rodada, depois de uma correção, bata no 409 da primeira.

## Usuários do seed

Os usuários de `team.e2e.users` existem depois de `<team.dev.seed>`, quando declarado. Um 401 no login de `otherRole`, `member` ou `otherTenant` no primeiro roteiro é dado ausente, não defeito.

## Armadilhas

- **Temporários fora do workspace.** Sandbox restrito ao workspace bloqueia escrita ou limpeza em `/tmp`; a rodada parece reprovar o PR. A pasta de trabalho e sua proteção por gitignore são as de `.claude/skills/pipeline-maestro/reference/e2e.md`, seção "Arquivos temporários".
- **Assinatura cedo demais.** Cabeçalhos gerados antes do login ou reaproveitados saem da janela anti-replay: 401 com credencial certa. O maestro confere que assinatura e envio estão na mesma linha; detalhe: `.claude/skills/pipeline-maestro/reference/e2e.md`, seção "Login assinado".
- **Cabeçalho ausente ou tenant errado.** `<team.e2e.login.headers>` resolvido errado produz o mesmo 401 de credencial errada. O maestro confere os cabeçalhos antes de reprovar.
- **Jar reaproveitado depois de migrate ou seed.** Sessões recriadas fazem um passo autenticado voltar 401; o roteiro começa sem jar e faz login novo, como em `.claude/skills/pipeline-maestro/reference/e2e.md`, seção "Login assinado".
- **403 que não prova a permissão da rota.** `otherRole` precisa de cargo vigente com outras chaves, sem a da rota; sem cargo pode receber 403 de outra guarda, com a chave pode receber 2xx após mudança no seed. O passo 7 confere mensagem, e o maestro usa o cargo nomeado no ticket.
- **Login 429 por tentativas seguidas.** Parece credencial errada, mas é limite de taxa após executor e validador repetirem login. O maestro espera a janela e não reprova o PR por isso.
- **500 com branch e migration certas.** Detalhe: parágrafo **Extensão nova do Postgres ausente no volume existente.** de `.claude/skills/pipeline-maestro/reference/armadilhas.md`, seção "Ambiente de dev".
