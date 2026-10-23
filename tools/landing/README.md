# Ferramentas opcionais de landing

Cinco ferramentas para o fluxo de landing: tratar a arte, montar o protótipo em arquivo único e renderizar e varrer a página. São **opcionais**: o core, as skills e os agentes não exigem nada daqui, e o `install.mjs` não copia esta pasta. Sem elas, o fluxo funciona igual, com arte e captura vindas de qualquer lugar.

## Requisitos

- Python: [`uv`](https://docs.astral.sh/uv/). Cada script declara as dependências no próprio cabeçalho (PEP 723), e o `uv run` as resolve sozinho.
- Node 22 ou mais, com uma instalação única nesta pasta: `npm install` e `npx playwright-core install chromium` (ou `--browser <executável>` em cada chamada).

## Como rodar

Do clone do toolkit, sem instalar nada no projeto:

```bash
uv run <clone>/tools/landing/ink.py <ilustração> <pasta de saída>
node <clone>/tools/landing/render.mjs <página> --out <pasta> --widths <landing.widths>
```

Quem prefere versionar copia a pasta para o repositório do projeto; a decisão é do projeto. Nenhuma ferramenta lê o `profile.yml`: quem chama passa `<landing.widths>` e `<landing.sweepWidths>` por argumento. Todas têm `--help`; erro de uso sai `1`.

| Ferramenta | Uso | O que faz |
| --- | --- | --- |
| `ink.py` | `ink.py <src> <outdir> [--max-width 1600] [--bg <#rrggbb>] [--dark-ink <#rrggbb>]` | separa o traço do fundo chapado (fundo pela mediana dos cantos, ou `--bg`) e grava `<nome>-light.png`; com `--dark-ink`, também `<nome>-dark.png` |
| `fill.py` | `fill.py <layer.png> <out.png> --bg <#rrggbb>` | dá corpo opaco à silhueta fechada da camada, pintada com `--bg`, para camadas empilhadas esconderem o que há atrás |
| `embed.py` | `embed.py <src.html> <assets-dir> <out.html> [--max-height <nome>=<px> ...]` | troca cada `{{img:<nome>}}` ou `{{img:<nome>\|<alt>}}` por `<img>` em WebP embutido, com tamanho e `loading="lazy"`; sai `1` se falta imagem ou sobra `{{` |
| `render.mjs` | `render.mjs <página> --out <dir> --widths <lista> [--height 900] [--scheme light\|dark] [--frame-ms 700] [--settle 4000] [--no-js] [--reduced-motion] [--wrap] [--browser <caminho>]` | por largura, três quadros do hero, a página rolada para baixo e **depois para cima**, e `summary.json`; sai `1` com rolagem horizontal ou erro de console ou de página |
| `sweep.mjs` | `sweep.mjs <página> [--widths <lista>] [--art <seletor>] [--text <seletor>] [--ignore <seletor>] [--tolerance 6] [--json <arquivo>] [--wrap] [--browser <caminho>]` | por largura (padrão: o default de `landing.sweepWidths`), sobreposição de arte com texto ou mock e rolagem horizontal; sai `1` se houver qualquer uma |

`<página>` é uma URL ou um caminho de arquivo; com `--wrap`, um fragmento sem doctype ganha um documento mínimo com `meta viewport`.

## Avisos

- **Tema antes da variante escura.** Tinta colorida invertida parece negativo: decida claro, escuro ou os dois antes de gerar a arte, e use `--dark-ink` só com o tema decidido.
- **`fill.py` exige `--bg`.** A cor da página é do projeto; a ferramenta não tem padrão.
- Não versione `node_modules/`, `package-lock.json` desta pasta nem o navegador.

## O que apoia

| Ferramenta | Apoia |
| --- | --- |
| `ink.py`, `fill.py` | o ilustrador, ao tratar a arte entregue, e a fase de produção de arte da skill de landing |
| `embed.py` | o designer, ao montar o protótipo em arquivo único, e a fase de protótipo da skill de landing |
| `render.mjs` | o validador, na rubrica nas larguras fixas (`<landing.widths>`), no protótipo e na página construída, incluindo rolar para cima, o primeiro e o último quadro do hero, sem JavaScript e com movimento reduzido |
| `sweep.mjs` | o validador, na varredura de sobreposição e de rolagem horizontal em `<landing.sweepWidths>`, no protótipo e na página construída |
