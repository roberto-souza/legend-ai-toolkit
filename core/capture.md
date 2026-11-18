# Ferramenta de captura de tela

Contrato entre o pipeline e a ferramenta de captura que cada projeto implementa e declara em `team.capture` (`.claude/pipeline/core/profile-schema.md`, seção "`team`"). O toolkit define o contrato, e o projeto escreve a ferramenta, porque login, build e proxy da API são dele. Quem usa: `.claude/skills/pipeline-maestro/roles/executor.md`, seção "Pedido de capturas pela ferramenta".

## O que a ferramenta é

- Código versionado no repositório do projeto. Não é spec: não roda no `check` nem no `gate`, e não é teste.
- O executor a roda no clone isolado, pelo `team.capture.command`, com `{scenarios}` (o caminho do arquivo de cenários), `{sha}` (o SHA do pedido), `{out}` (a pasta de saída) e `{root}` (a raiz do checkout principal) resolvidos.
- Ela builda o SHA, serve o build numa porta livre fora das portas de `team.portals`, faz o login, roda os cenários num navegador headless com foco e encerra tudo o que subiu.
- A credencial é lida de `{root}/<team.credentials.file>` pelo nome da variável e nunca é impressa: o arquivo é ignorado pelo git e só existe no checkout principal.
- Saída 0: rodou todos os cenários, mesmo com medida em `FALHA`. Saída diferente de 0: a ferramenta não rodou (build, API fora do ar, login), e o executor responde `TRAVADO: <motivo>`.
- Os nomes de valor do contrato (`claro`, `escuro`, `celular`, `cenario`, `varredura`, `irma`) são fixos e em português, como os nomes de arquivo das capturas.

## Arquivo de cenários

JSON, um por PR e por rodada, escrito pelo executor em `<pasta>/cenarios.json`.

```json
{
  "pr": 0,
  "sha": "<sha>",
  "round": 1,
  "fronts": { "<app de team.portals>": "<url com {slug} resolvido>" },
  "scenarios": [
    {
      "id": "cenario-1-<tela>-desktop-claro",
      "kind": "cenario",
      "ref": "cenário 1",
      "app": "<app de team.portals>",
      "screen": "<tela em kebab-case>",
      "route": "/<rota>",
      "viewport": "desktop",
      "theme": "claro",
      "waitFor": "<seletor da tela da rota: título ou elemento declarado no cenário>",
      "actions": [
        { "click": "<seletor que navega>", "waitFor": "<seletor da tela de destino>" },
        { "click": "<seletor>" },
        { "fill": "<seletor>", "value": "<texto>" },
        { "waitFor": "<seletor>" },
        { "press": "<tecla, como Escape ou Control+K>" },
        { "route": "<padrão de URL da requisição>", "delayMs": 3000 },
        { "route": "<padrão de URL da requisição>", "abort": true }
      ],
      "capture": "page",
      "fullPage": false,
      "transient": false,
      "expected": "<o que a captura mostra: tela, estado e dado visível>",
      "measures": [
        { "type": "touchTarget", "selector": "<seletor>", "min": 44 },
        { "type": "contrast", "selector": "<seletor>", "min": 4.5 },
        { "type": "overflow", "selector": "<seletor>" },
        { "type": "aria", "selector": "<seletor>", "name": "<nome acessível>", "attributes": { "aria-expanded": "true" } },
        { "type": "url", "path": "/<rota depois das ações>", "params": { "<param>": "<valor>" } },
        { "type": "overlap", "selectors": ["<seletor>", "<seletor>"] }
      ],
      "consoleAllow": ["<regex de erro esperado neste cenário>"]
    }
  ],
  "outOfScript": [
    { "ref": "cenário 3", "reason": "<o que o headless não prova: atalho de teclado, foco, colar>" }
  ]
}
```

| Campo | O que é |
| --- | --- |
| `id` | nome do PNG sem `.png`; único no arquivo. Cenário: `cenario-<k>-<tela>-<viewport>-<tema>`; varredura: `<tela>-<viewport>-<tema>`; irmã: `irmas/<name>-<viewport>-<tema>` |
| `kind` | `cenario`, `varredura` ou `irma` (a categoria da linha do manifesto) |
| `ref` | o cenário ou o critério do ticket de onde veio a linha; `varredura` e `irma` repetem o `kind` |
| `viewport` | `desktop` (o tamanho que o projeto declara em `knowledge.verification`, seção "PR de tela") ou `celular` (390 × 844, agente de usuário móvel e toque) |
| `theme` | `claro` ou `escuro`, trocado pelo controle de tema da tela, nunca por CSS injetado |
| `waitFor` (do cenário) | seletor da tela da rota (título ou elemento declarado no cenário); a ferramenta o espera visível depois de abrir a rota, antes da primeira ação; ausente = a ferramenta segue como hoje |
| `actions` | em ordem, depois de abrir a rota: `click`, `fill`, `waitFor` (espera o elemento visível), `press` (tecla ou atalho no elemento com foco), `route` (atraso ou `abort` da requisição) |
| `waitFor` (de `click` e `press`) | na ação que navega (muda a URL ou troca a tela), o seletor da tela de destino; a ferramenta o espera visível antes da ação seguinte e da foto; ausente = a ferramenta segue como hoje |
| `capture` | `page` (a página inteira), `viewport` ou um seletor (só o elemento) |
| `fullPage` | com `capture: "page"`, `false` fotografa só a janela (o mesmo que `viewport`), para tela com cabeçalho ou rodapé preso, que a foto da página inteira repete ou desloca; ausente = `true` |
| `transient` | `true` quando a evidência é modal, menu, painel ou toast aberto; a captura sai depois do `waitFor` e do fim das animações, nunca com `finish()` nem `transform` mexido |
| `expected` | a descrição do cenário: só o que a captura mostra (tela, estado, dado visível, como "lista com uma linha em cada estado: pago, pendente e vencido"), nunca o critério nem um juízo ("o filtro funciona", "o ajuste entrou") |
| `measures` | as medidas do cenário (seção "Medidas"); varredura e irmã podem vir sem |
| `consoleAllow` | erros de console esperados no cenário; ausente = nenhum |
| `outOfScript` | o que vira passo pontual de portal (colar, permissão do navegador); a ferramenta copia cada item para `## Fora do script` do manifesto |

## Espera antes da foto

Antes de cada foto, depois das ações e dos `waitFor`, a ferramenta espera o fim das transições e animações da página: `Promise.all(document.getAnimations().map(a => a.finished))`, sem as de duração infinita (`effect.getComputedTiming().endTime === Infinity`, como um indicador de carregando), com um prazo da própria ferramenta. Ela nunca chama `finish()` nem mexe em `transform`: a foto sai com a tela no estado final de fato. Menu, folha e painel que deslizam só aparecem inteiros depois dessa espera.

## Medidas

Todo cenário mede o console. As outras medidas só rodam quando o cenário as declara. Cada medida é calculada no navegador, depois das ações, e dá um valor, um limite e `OK` ou `FALHA`.

| `type` | Mede | `FALHA` quando |
| --- | --- | --- |
| `touchTarget` | a bounding box de cada elemento do seletor | largura ou altura abaixo de `min` (px), que vem do critério ou do projeto |
| `contrast` | o contraste da cor do texto contra o primeiro fundo opaco dos ancestrais (razão WCAG) | razão abaixo de `min` |
| `overflow` | `scrollWidth` contra `clientWidth` de cada elemento do seletor; sem seletor, todos os cartões que o projeto marca | `scrollWidth > clientWidth` em algum elemento; o valor nomeia o pior |
| `aria` | o nome acessível e os atributos `aria-*` do elemento | nome diferente de `name`, ou atributo diferente do declarado |
| `url` | o caminho e os parâmetros da URL antes da primeira ação e depois da última | caminho ou parâmetro diferente do declarado |
| `console` | `console` do tipo `error` e `pageerror` | erro fora de `consoleAllow` |
| `overlap` | as bounding boxes dos elementos do seletor, duas a duas | duas caixas se cruzam |

Seletor de medida que não acha elemento não reprova o PR: o cenário sai `FALHA DO SCRIPT: seletor sem elemento <seletor>`, porque o erro costuma ser do arquivo de cenários.

## Saída

Tudo em `{out}`. A ferramenta apaga antes só o que ela mesma grava (os PNG, `capturas.md`, `medidas.json` e `irmas/`), nunca outra `rodada-<k>/`, o `cenarios.json`, o `dados-criados.md` nem os arquivos da leitura da UX.

- **PNG:** um por cenário, em `{out}/<id>.png`.
- **Ordem:** o `medidas.json` é o último arquivo que a ferramenta grava, de uma vez, depois dos PNG e do `capturas.md`: o sentinela do maestro trata o `medidas.json` novo como entrega do pedido.
- **`capturas.md`:** uma linha por cenário, no formato de `.claude/skills/pipeline-maestro/roles/executor.md`, seção "Pedido de capturas", passo 12 (o campo da evidência leva o `expected` do cenário), mais `## Fora do script` com os itens de `outOfScript`. Cenário cuja ação não se cumpre (o elemento não aparece no prazo) grava o que a tela mostra e marca a linha `FALHA DO SCRIPT: <o que esperava>`.
- **`medidas.json`:**

```json
{
  "pr": 0,
  "sha": "<sha>",
  "round": 1,
  "scenarios": [
    {
      "id": "cenario-1-<tela>-desktop-claro",
      "file": "cenario-1-<tela>-desktop-claro.png",
      "transient": false,
      "result": "OK",
      "measures": [
        { "type": "overflow", "selector": "<seletor>", "value": "812/768", "limit": "scrollWidth <= clientWidth", "result": "FALHA" },
        { "type": "console", "value": "sem erro", "limit": "nenhum erro fora de consoleAllow", "result": "OK" }
      ]
    }
  ]
}
```

- `result` do cenário: `FALHA DO SCRIPT` quando a ação não se cumpriu ou um seletor de medida não achou elemento, `FALHA` com uma medida em `FALHA`, senão `OK`.
- `value` e `limit` são texto, para caber qualquer medida.

## Por que assim

- O roteiro descartável refazia build, servidor, login e seletores a cada pedido e perdia tempo em timeout. A ferramenta versionada se reaproveita entre PRs e pilhas.
- Medida numérica lida em imagem erra: um manifesto que diz `768/768` não pega o texto que passa da borda do cartão. Medida que reprova sozinha vale como o `FALHA` de um E2E.
- O executor escreve só cenários a partir das linhas `— verify:` e dos cenários "(verificação)" do ticket. Ele não escreve código de captura, e a captura fica repetível.
