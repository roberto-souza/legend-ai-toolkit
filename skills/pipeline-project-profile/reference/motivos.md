# Por que o profile recusa

Os motivos das recusas e da trava do `pipeline-project-profile`; as ações estão no checklist da skill.

## Combinações obrigatórias

- `topology: polyrepo` exige `workspace.repos`, com `repo` em cada item: sem a lista não há como saber qual issue é deste repositório nem onde estão as outras.
- `issues.titleUnit: repo` exige `topology: polyrepo`: a unidade só pode ser o repositório quando há mais de um sob o board.
- `branches.base` diferente de `branches.default` exige `closing.mode: close-references-mutation`: com base fora da default o GitHub ignora o `Closes #N`, e o PR nasceria sem vínculo.
- `closing.mode: close-references-mutation` exige `closing.workflow`: quem fecha a issue no merge é aquele workflow, não o GitHub.
- Com `topology: polyrepo`, `<repo>` precisa estar em `workspace.repos`: profile que não se declara entre os irmãos deixa o executor sem como decidir o que é deste repositório.

## Trava de repositório

- Pode haver vários projetos na mesma máquina com a mesma estrutura de pipeline.
- Um comando de Project carrega `--owner` e um número, e nenhum dos dois é derivado de onde você está: o comando certo na pasta errada escreve no board errado, com exit 0 e sem sintoma.
- `gh repo view` resolve pelo remote do diretório atual: é a única coisa na cadeia que sabe onde você está de verdade.

## Polyrepo

- A trava vale ainda mais: o board é compartilhado, os números de issue colidem entre os irmãos e um comando de Project não sabe de onde foi chamado.

## Landing

- `landing.taste` aceita só `default` (o `taste` padrão do core) ou um caminho `.md` do projeto, que **substitui** o padrão por inteiro: mesclar dois arquivos de gosto cria o caso "qual linha vale", e quem quer só acrescentar copia o padrão e edita. Valor que não é nem um nem outro é erro de digitação.
- `landing.formatCommand` exige `{files}`: comando de projeto sem o lugar do argumento é a falha silenciosa mais provável (formata tudo, ou nada), e a recusa é barata, como em `{udid}` e `{bodyFile}`.
- `landing.lineBudget` aceita só `logic` e `section`: chave de outro nome é erro de digitação (`sections`) que, sem recusa, vira o default em silêncio.
- `landing.app` e `landing.handoff` são relativos, sem `..`, e diferentes: o profile é versionado, e o handoff pode ser ignorado pelo git enquanto o app não; apontar os dois para o mesmo lugar mistura ou versiona o que não devia.
