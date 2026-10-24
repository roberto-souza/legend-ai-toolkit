# Formato dos arquivos do pipeline

O contrato que todo arquivo principal e toda referência do pipeline seguem; o `/pipeline-doctor` (item 25) confere os ponteiros e o teto de linhas.

## Arquivo principal

- Arquivo principal é o `SKILL.md` de `.claude/skills/pipeline-*`, os `.claude/agents/pipeline-*.md` e os `.claude/skills/pipeline-maestro/roles/*.md`.
- Layout: frontmatter com as chaves inalteradas; `## Entrada` primeiro quando a skill é interna (o item 22 do doctor exige o título); depois as seções **na ordem de execução, com os nomes de hoje** (Fase N, Passo N, item N, "Mover o card"…), para quem as cita não quebrar; dentro de cada uma, passos numerados.
- Exceção declarada: os comandos (skills com `model:` no frontmatter — hoje `pipeline-ticket`, `pipeline-execute`, `pipeline-security` e `pipeline-landing`) são frontmatter, leitura da skill interna por caminho e tratamento de argumentos, sem passos numerados.

## Passo

- Uma ação imperativa, de no máximo ~2 linhas, com o comando concreto (bloco de código quando tem várias linhas) ou a checagem e a condição de parada (`→ pare se …`).
- Termina com um ponteiro quando há detalhe.

## Todo passo fica no checklist

- A referência guarda motivo, exemplo, tabela, modelo e armadilha; nunca uma ação que o checklist não tenha.
- Exceção: procedimento de fase ou de papel pode morar em `reference/` quando o checklist o carrega por passo de leitura obrigatória, na forma ``Leia `<arquivo>`, seção "<X>", e siga os passos.`` (nunca por "Detalhe:" ou "Motivo:"); motivo e armadilha seguem a regra acima.
- Leitura obrigatória é um passo próprio: ``Leia `<caminho>`, seção "<título>".``
- Detalhe opcional: ``Detalhe: `<caminho>`, seção "<título>".``

## Ponteiro

- Sintaxe canônica: caminho a partir da raiz do repositório, entre crases, terminado em `.md`, sem `<`, `>`, `*`, `{` nem `}`, opcionalmente seguido de `, seção "<título exato do cabeçalho, sem o #>"`.
- O item 25 confere todo caminho `.md` entre crases que contém `/` ou leva `, seção`. Nome solto sem `/` e sem `, seção` (o nome curto de uma extensão, por exemplo) é menção, não ponteiro. Caminho com marcador ou glob não é conferido.
- Seção do mesmo arquivo cita-se só por `seção "<título>"`, sem caminho, e um placeholder de pasta (`<roles>`, por exemplo) definido no próprio arquivo dispensa o caminho inteiro; nenhum dos dois é conferido.
- Parágrafo em negrito dentro de uma seção se cita nomeando o parágrafo antes do ponteiro canônico da seção: ``parágrafo **<X>.** de `<caminho>`, seção "<título>"``.

## Referência

- Fica em `.claude/skills/<skill>/reference/<tema>.md` (kebab-case ASCII), com título `#` e seções `##`.
- Agent e papel não têm pasta: o detalhe deles vai para a referência da skill dona (papéis do Maestri → `.claude/skills/pipeline-maestro/reference/`).
- Os docs do core (`principles.md`, `profile-schema.md`, `entrada.md`, `format.md` e os demais de `.claude/pipeline/core/`) e as extensões do repositório são referências: enxutos (tabela, bullet curto), sem checklist e sem teto de linhas.
- Referência de um doc do core segue o precedente `.claude/pipeline/core/<tema>-reference.md` (`seals-reference.md`, `ux-reference.md`).

## Armadilha

- Armadilha sai do arquivo principal para a referência; no checklist ela fica só como condição de parada dentro do passo que ela afeta.

## Lugar único

- Toda regra vive em um arquivo; os outros apontam para ele.
- Exceção: checagem que roda em vários fluxos vira um passo de uma linha em cada um, apontando para a explicação única.

## Quem move uma seção

- Quem move ou renomeia uma seção atualiza todo arquivo que a cita (`git grep -n '<título antigo>'`): as instruções do projeto, os arquivos de entrada dos agentes, o README, `docs/`, a memória versionada, as pastas de agentes das outras ferramentas e o profile.

## Teto

- 150 linhas por arquivo principal é **meta, não critério de reprovação** (`AVISO` no item 25 do doctor).
- Toda reescrita informa a contagem de linhas antes e depois no `## Test plan` do PR; mudança intermediária mantém as seções enxutas; a que termina um arquivo e ainda passa de 150 explica em `## Decisions` quais passos o mantêm acima.
- **Nunca** tire um passo do checklist, nem junte dois passos num que perca uma condição, para caber no teto.

## Arquivo de instruções do projeto

- `<knowledge.projectInstructions>` é índice: cada regra em uma linha, com ponteiro para o detalhe.
- Histórico, motivo, exemplo e procedimento ficam fora dele (ADR, module map, memória versionada, referência).
- Com `knowledge.instructionsBudget`, o `node .claude/pipeline/core/document-budget.mjs` no `<gate.final>` reprova o arquivo acima do teto; conferência: `.claude/skills/pipeline-doctor/SKILL.md`, item 29.

## Idioma

- Arquivo existente mantém o idioma que tem hoje: reescrita nunca traduz (alguns arquivos de agent estão em outro idioma que o das skills, e continuam assim).
- Arquivo de processo novo nasce em `<language.conversation>`; issue, PR, commits e relatórios saem em `<language.artifacts>`.

## Equivalência nas reescritas

- Reescrita não remove regra, comando nem condição de parada.
- O `## Test plan` do PR traz uma tabela com uma linha por cabeçalho `##`/`###` e por regra em negrito do texto antigo (`git show origin/<branches.base>:<arquivo>`) → novo lugar (arquivo + passo ou seção), mais a contagem de linhas de cada arquivo principal antes e depois.
