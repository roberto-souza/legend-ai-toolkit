# Setup do time: motivos

Os motivos dos passos de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Setup do time". Os passos e os comandos moram lá.

## Os papéis do time

- O maestro é a sessão que invoca a skill: despacha, acompanha e mantém a nota de estado, e nunca edita código.
- O executor roda o `/pipeline-execute` num clone isolado.
- O validador de API percorre um roteiro E2E; o validador de tela confere as capturas que o executor grava e percorre só os passos pontuais de portal; no app, percorre o roteiro de aparelho. É sempre um roteiro fechado por PR.
- O critério de cada roteiro é o de `<knowledge.verification>`; a skill é só a mecânica.
- A especialista de UX e o validador de reserva entram quando o profile os declara.

## Modelo do maestro

- A checagem do modelo da sessão na entrada é aviso, não parada, porque a skill não tem pin de modelo.

## Executor sem role e com dir

- O executor sobe sem `--role` e com `--dir` na raiz do clone: o papel entra por mensagem, porque o diretório do papel faz o Claude Code perder as settings e as skills do projeto. A armadilha completa, com o sintoma, está em `.claude/skills/pipeline-maestro/reference/armadilhas.md`, seção "Terminais e papéis".

## O floor não se apaga

- Apagar o floor apaga o clone onde o executor trabalha.
- A raiz do clone vai para `## Decisões`, para uma sessão nova achá-la sem o histórico (os `udid` e o slug do tenant já estão lá).

## Quem cria os portais

- O validador de tela cria cada portal porque `portal create` liga o portal a quem o cria, e é ele quem o usa. O maestro e o validador de API nunca criam portal.
- O serial do emulador Android só existe depois que o portal o liga, e o maestro não está ligado ao portal; por isso o `udid` vem pela resposta do validador, não de um comando do maestro.
- O `udid` é fato da máquina: vai para `## Decisões` da nota e nunca entra no profile.

## A pasta de capturas da UX

- O `--dir` da especialista é a pasta de capturas, para ela ler os PNGs sem sair do diretório dela. Ela não se conecta à nota: quem registra é o maestro.

## Conexões só validador e nota

- O recrutado já nasce ligado ao maestro, e a nota nasce ligada ao maestro, que a criou. `maestri connect` liga só agente e nota, então as únicas conexões a fazer são validador ↔ nota.

## Portais e especialista de UX

Passos dos passos (os números são os de `.claude/skills/pipeline-maestro/SKILL.md`):

9. **Portais de navegador.** Resolva `<team.portals>` (todos os itens) numa lista com um `maestri portal create <url> "<name>"` por item, `{slug}` trocado pelo slug de `## Decisões`.
10. **Portais de aparelho** (só com `<team.devices>` declarado). Rode `maestri portal devices` e escolha, para cada item de `<team.devices>`, um aparelho **livre** da `platform` e do `formFactor` declarados.
    - Acrescente à lista, um por item, `maestri portal create --simulator <id> "<name>"` seguido de `maestri portal info "<name>"`.
    - → nenhum aparelho livre que sirva: pergunte ao usuário (criar aparelho é dele).
11. **Enviar os portais.** Uma só mensagem: `maestri ask "[VALIDADOR UI] <team.roles.validatorUi.tool>" "<lista>"`, com os passos 9 e 10, pedindo ao validador que responda com o `udid` da primeira linha de cada portal de aparelho.
    - O validador de tela cria cada portal com o nome exato; o maestro não cria portal, e o validador de API também não.
    - Grave cada `udid` em `## Decisões`, nunca no profile.
    - Detalhe: `.claude/skills/pipeline-maestro/reference/setup.md`, seção "Quem cria os portais".
12. **Especialista de UX** (só com `<team.roles.ux>` declarado). `mkdir -p <raiz do checkout principal>/<team.roles.ux.dir>`, depois recrute **sem `--role`**:
    - `maestri recruit "[UX] <team.roles.ux.tool>" --command "<team.roles.ux.command>" --dir <raiz do checkout principal>/<team.roles.ux.dir>`, com `{root}` trocado pela raiz do checkout principal (`git rev-parse --show-toplevel`, no Ground)
    - O "trust this folder" se responde como no passo 7; mande `.claude/skills/pipeline-maestro/roles/ux.md` com `<team.roles.ux.audience>` resolvido: `maestri ask "[UX] <team.roles.ux.tool>" "<conteúdo>"`.
    - Sem a chave: registre na nota "validação de UX não configurada" e siga.
    - A especialista não se conecta à nota: quem registra é o maestro.
    - Detalhe: `.claude/skills/pipeline-maestro/reference/setup.md`, seção "A pasta de capturas da UX".

## Recrutar os validadores

Passos dos passos 6 e 7 de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Setup do time":

6. **Validador de API.** Resolva as `<team.…>` de `.claude/skills/pipeline-maestro/roles/validador-api.md` num arquivo do scratchpad, `maestri role create "Validador API" "$(cat <arquivo>)"` (existe → `role write`) e `maestri recruit "<VAL-API>" --role "Validador API" --command "<team.roles.validatorApi.command>"` (`{root}` = `<raiz>`). Sem lista de portais.
7. **Validador de tela.** `maestri recruit "<VAL-UI>" --command "<team.roles.validatorUi.command>" --dir <raiz>` (`{root}` = `<raiz>`), **sem `--role`**; "trust this folder" → `maestri ask "<terminal>" --raw "\n"`; mande `.claude/skills/pipeline-maestro/roles/validador-ui.md` resolvido por `maestri ask`.
