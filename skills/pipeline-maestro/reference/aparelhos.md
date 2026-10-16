# Aparelhos no portal

## Lançamento pelo Maestri

No iOS, só o app lançado pelo Maestri expõe a árvore de acessibilidade. O `snapshot` de app aberto por fora devolve imagem em vez de árvore, com o motivo em `accessibility:`. O `build` abre o app fora do Maestri; por isso `maestri portal launch "<portal>" <appId>` vem depois dele.

## Toque e snapshot

O ref do `snapshot` mais recente identifica o alvo do toque; coordenada não substitui um ref disponível. Uma mudança de tela exige um novo `maestri portal snapshot`. O `testID` (`id=` na árvore) é o alvo quando existe, porque o rótulo muda com o idioma.

## Digitação

No simulador iOS, o teclado do sistema roda fora do processo do app: nem `type` nem toques nas teclas chegam ao campo, que continua vazio mesmo focado. O humano faz o login uma vez e a sessão sobrevive aos lançamentos seguintes. Cenário com digitação roda num aparelho Android de `<team.devices>`; sem ele, fica "não se aplica: digitação no iOS".

No Android, `type` acrescenta texto ao campo. Campo vazio recebe a digitação; restos são limpos com `key Backspace`.

## Corte de rede

O corte acontece no aparelho, pelos comandos `offline`/`online` de `team.devices` (`.claude/pipeline/core/profile-schema.md`, seção "`team`"). O simulador iOS não tem modo avião nem corte próprio: sem `offline` declarado, o cenário segue online e roda no aparelho que declara o corte. Parar ou congelar a API não é offline: o app ainda vê rede, não mostra o estado offline e não escoa a fila na reconexão.

O roteiro sempre devolve a conexão com `online`, inclusive na falha. Aparelho sem `offline` declara o cenário "não se aplica: aparelho sem corte de rede declarado"; o cenário roda nos aparelhos que declaram o corte.

## Banco local de outra branch

Banco local criado por outra branch com schema mais novo pode quebrar a leitura: lista vazia ou erro ao abrir, mesmo na branch certa. Apagar os dados do app ou reinstalar pelo `build` resolve o ambiente; não é achado do PR.

## Build e bundler

O JS da branch chega pelo bundler (`team.dev.appUp`). O build nativo só é necessário com o app ausente ou com o PR na lista de build nativo do critério. O executor nunca builda nem sobe o bundler no clone: a porta e o aparelho pertencem ao checkout principal.

## Armadilhas

- **Relançamento pede código ou biometria.** O validador para numa tela do sistema: `TRAVADO`, não achado; o maestro pede ao usuário, nunca adivinha código.
- **Captura de simulador ou emulador não prova bloqueio de captura.** O print pode mostrar a tela protegida; a verificação do bloqueio é em aparelho físico pelo humano, nunca pelo roteiro.

## Roteiro de app

Passos completos de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Validação de app", com os nomes completos dos terminais (`[EXECUTOR] <team.roles.executor.tool>` etc.), `<raiz>` o checkout principal e `<gate>` o `node <raiz>/.claude/pipeline/core/pipeline-gate.mjs`.

O critério está em `<knowledge.verification>`, seção "PR de app"; aqui fica a mecânica.

1. Leia `<knowledge.verification>`, seção "PR de app" (aparelhos, temas, idiomas, conectividade, lista de build nativo, formato da linha).
2. Aplique ao PR de app e à parte de app do PR misto. Sem `<team.devices>` → pare aqui, além do motivo registrado no roteamento. Detalhe: `.claude/skills/pipeline-maestro/SKILL.md`, seção "Roteamento por tipo de PR"; `.claude/pipeline/core/profile-schema.md`, seção "`team`".
3. Prepare o ambiente por `.claude/skills/pipeline-maestro/SKILL.md`, seção "PR aberto pelo executor"; suba `<team.dev.appUp>` no checkout principal quando declarado e fora do ar.
4. Por portal de aparelho, use o `udid` de `## Decisões`: app ausente ou PR na lista de build nativo → rode o `build` de `<team.devices>`, com `{udid}` trocado, no checkout principal; senão, use o bundler. O executor nunca builda nem sobe bundler no clone. Detalhe: `.claude/skills/pipeline-maestro/reference/aparelhos.md`, seção "Build e bundler".
5. Escreva o cabeçalho com PR, branch, SHA, portais de aparelho pelo `name`, a seção "Proibições" de `.claude/skills/pipeline-maestro/roles/validador-ui.md` copiada literalmente e o formato da linha da nota.
6. Primeiro passo por aparelho, depois do `build`: `maestri portal launch "<portal>" <appId>`. Detalhe: `.claude/skills/pipeline-maestro/reference/aparelhos.md`, seção "Lançamento pelo Maestri".
7. Escreva cada passo com ação (`click` pelo ref do `snapshot`, nunca coordenada quando há ref; `type`; `scroll`; `key back` no Android), alvo pelo `testID` (`id=`) quando existe e resultado esperado; termine com `maestri portal snapshot` e, quando a nota pede imagem, `maestri portal screenshot`, `mkdir -p` e `cp` para a pasta de capturas. Detalhe: `.claude/skills/pipeline-maestro/reference/aparelhos.md`, seção "Toque e snapshot".
8. Digitação no iOS → passo num aparelho Android de `<team.devices>`; sem ele, "não se aplica: digitação no iOS". No Android, `type` só em campo vazio; limpe restos com `key Backspace`. Detalhe: `.claude/skills/pipeline-maestro/reference/aparelhos.md`, seção "Digitação".
9. Escreva `offline` daquele aparelho antes da ação e `online` depois, literais com `{udid}` trocado; o roteiro sempre termina com o `online` (antes do selo), inclusive num `REPROVADO`. Sem `offline` → registre "não se aplica: aparelho sem corte de rede declarado" e rode o cenário nos aparelhos que o declaram. Detalhe: `.claude/skills/pipeline-maestro/reference/aparelhos.md`, seção "Corte de rede".
10. Escreva as trocas de tema e idioma pelo controle do app que o maestro nomeia; nunca pela configuração do aparelho, salvo cenário de seguir o aparelho.
11. Efeito fora do app (web, API) → passo no portal de navegador correspondente de `<team.portals>`, no mesmo roteiro, depois da ação do app.
12. Depois de devolver a conexão, último passo só no sucesso (com navegador e aparelho no PR, só no último roteiro): `node <raiz do checkout principal>/.claude/pipeline/core/pipeline-gate.mjs stamp screen --pr <pr> --sha <sha> --evidence "<…>"`.
13. Envie `maestri ask "[VALIDADOR UI] <team.roles.validatorUi.tool>" "<roteiro>"`.
14. Leia a resposta por `.claude/skills/pipeline-maestro/roles/validador-ui.md`, seção "Resposta". `TRAVADO` → resolva com o usuário e redespache a partir do passo, sem achado; lista vazia ou erro ao abrir na branch certa → apague os dados ou reinstale pelo `build` e redespache, sem achado. Detalhe: `.claude/skills/pipeline-maestro/reference/aparelhos.md`, seção "Banco local de outra branch".
15. Confira `stamped pipeline/screen …`; ausente ou de erro → pare: parágrafo **Resposta sem selo.** de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Roteamento por tipo de PR".
16. Com `APROVADO` e `<team.roles.ux>` declarado, siga `.claude/skills/pipeline-maestro/SKILL.md`, seção "Validação de UX", com as capturas do app.
