# UX: telas irmãs e conferência do `PRONTO`

Detalhe de "Validação de UX" da skill `pipeline-maestro`, que traz a lista curta. Chave do profile: `team.roles.ux.siblings`
(`.claude/pipeline/core/profile-schema.md`).

## Para que servem

- A UX só dá nota à tela do PR. Sem outra tela ao lado, "consistência com o resto do sistema" é julgada às cegas. A irmã é a
  referência: não recebe nota e não entra na média.
- O `PRONTO` da UX é um texto. O maestro abre as capturas antes de aceitá-lo, porque captura cortada, tela errada ou variante
  faltando passam enquanto a UX não notar.

## Seleção das irmãs

Só com `<team.roles.ux.siblings>`. Para cada tela do PR, no `app` dela:

| Caso | O que se captura |
| --- | --- |
| a tela se parece com um `pattern` declarado para o `app` | as irmãs do `app` com esse `pattern` |
| nenhuma irmã do `app` tem `pattern` parecido | todas as irmãs do `app` |
| a `route` da irmã é ela mesma tela do PR | essa irmã sai da seleção |
| a mesma irmã é escolhida por duas telas do PR | uma captura só |
| a `route` leva `:<param>` | o maestro troca por id real de registro do tenant de teste (slug de `## Decisões` quando o parâmetro é o slug) |
| `app` sem irmãs declaradas | a mensagem diz `sem telas irmãs declaradas para <app>` |
| profile sem `team.roles.ux.siblings` | nada muda: só as telas do PR |

Exemplo (genérico): o PR muda a tela de rota `R1`, `pattern` `list`; o `app` declara `a-list`, `b-list` (`list`), `a-detail`
(`detail`) e `R1` é a rota de `a-list`. Capturam-se `b-list` só; `a-list` sai por ser tela do PR e `a-detail` por ser outro
`pattern`.

## Variantes e pastas

- As irmãs saem nas mesmas variantes da tela do PR: web, desktop/celular × claro/escuro; app, um aparelho por item de
  `<team.devices>` × claro/escuro. No app, o roteiro chega à `route` pela navegação do próprio app, como em qualquer passo de app.
- O `<variante>` do arquivo é escrito exatamente como o da tela do PR (`<name>` da irmã no lugar de `<tela>`).

| Rodada | Capturas do PR | Irmãs |
| --- | --- | --- |
| 1 | `<raiz>/<team.roles.ux.dir>/pr-<n>/<tela>-<variante>.png` | `<raiz>/<team.roles.ux.dir>/pr-<n>/irmas/<name>-<variante>.png` |
| `k` ≥ 2 | `<raiz>/<team.roles.ux.dir>/pr-<n>/rodada-<k>/<tela>-<variante>.png` | `<raiz>/<team.roles.ux.dir>/pr-<n>/rodada-<k>/irmas/<name>-<variante>.png` |

`<raiz>` é a raiz do checkout principal. Dois itens do mesmo `app` com o mesmo `name` sobrescreveriam a captura um do outro:
o `pipeline-project-profile` recusa.

## Mensagem para a UX

- Bloco das telas do PR: o de hoje (descrição de cada tela, decisões do solicitante, caminhos).
- Bloco separado, titulado como **referência, sem nota**: cada captura de irmã com `name`, `route` e `pattern`.
- Sem irmãs na rodada, o bloco não existe e a mensagem diz o porquê (`sem telas irmãs declaradas para <app>`).

## Conferência do `PRONTO`

1. O maestro abre, uma a uma, todas as capturas das telas do PR da **rodada final**, todas as variantes, com a ferramenta de
   leitura de imagem da sessão (`Read`, no Claude Code). Irmã não conta.
2. Registra no item do PR: `capturas conferidas pelo maestro: <q> arquivos (rodada <k>)`, com `<q>` os arquivos abertos.
3. Aceita: segue o fluxo de hoje (`## Pronto para merge`, `maestri notify` com a pilha inteira).

Com `team.capture`, a conferência é por amostra (seção "Uma leitura, dois laudos"):

1. O maestro abre toda captura citada num `[BLOQUEIA]` ou num `FALHA` (de medida ou do laudo de tela), toda captura de estado
   transitório (`transient: true` em `medidas.json` e as dos passos pontuais) e, por tela do PR, uma captura de cenário e uma
   de varredura.
2. Registra no item do PR: `capturas conferidas pelo maestro: <q> de <total> (amostra e bloqueios)`, com `<total>` os PNG da
   rodada sem as irmãs.
3. Uma captura da amostra que não sustenta o `PRONTO` → abra as demais da mesma tela antes de recusar.
4. Na recusa, a rodada nova é pedido pela ferramenta e leitura única
   (`.claude/skills/pipeline-maestro/reference/validacao-ux.md`, seção "Leitura única"), e a linha de recusa diz que nem
   `pipeline/screen` nem `pipeline/ux` daquele SHA valem.

Recusa, quando a captura não sustenta o `PRONTO`:

| Achado | Caminho |
| --- | --- |
| captura cortada, tela errada ou variante faltando | o maestro refaz as capturas e roda nova rodada de UX |
| divergência das irmãs que a UX não apontou | registra no item e roda nova rodada de UX |
| problema de código | `AJUSTAR` ao executor, como qualquer achado |

Na recusa o maestro não move o item para `## Pronto para merge`, não notifica e escreve no item
`PRONTO da UX recusado pelo maestro: <motivo> — o selo pipeline/ux de <sha curto> não vale`.

## Uma leitura, dois laudos

Só com `team.capture`. Sem a chave, o validador de tela confere as capturas, a UX as lê de novo e o maestro abre todas.

- Três leituras em série das mesmas imagens custavam mais que a captura. Com a medida calculada pela ferramenta
  (`.claude/pipeline/core/capture.md`), o que sobra para o olho é o que só o olho vê: a evidência do cenário e a régua de UX.
- Um papel de contexto limpo, a UX, lê cada captura uma vez e dá o laudo de tela e o de UX. Os selos continuam dois,
  `screen` e `ux`, gravados por ela em duas chamadas, cada uma sozinha. O executor nunca grava nenhum dos dois.
- O maestro não relê tudo: confere o que a leitura bloqueou ou reprovou, o estado transitório (o que mais engana a captura)
  e uma amostra por tela, que pega captura cortada, tela errada ou variante faltando.
- A medida em `FALHA` reprova sem leitura visual; a UX só confirma que a captura a sustenta.

## O selo `pipeline/ux`

- A UX grava o selo ao responder `PRONTO` (`.claude/pipeline/core/seals.md`), antes de o maestro conferir. Recusa deixa um selo
  `success` num SHA que o maestro não aceitou: não existe revogação nem `failure`, então o que impede o merge é o maestro
  não fechar o item (sem `## Pronto para merge`, sem notify), e a linha de recusa diz que o selo daquele SHA não vale.
- Correção de código cria commit novo, e commit novo nasce sem selo: a recusa por código se resolve sozinha pelos selos.
- Recusa por captura, sem commit novo: a rodada nova pede um `PRONTO` novo, e é ele que o maestro confere.

## Armadilhas

- Irmã cortada: a UX diz que está cortada e não a usa; o maestro refaz a captura, não ignora.
- Irmã com id real: registro apagado vira tela vazia. O maestro escolhe um registro que existe no tenant de teste.
- Média: só telas do PR. Irmã com nota, ainda que informal, distorce o `≥ 8`.
