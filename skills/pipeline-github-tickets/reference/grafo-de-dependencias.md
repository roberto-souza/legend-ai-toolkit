# Grafo de dependências

Motivos e armadilhas dos passos de `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Grafo de dependências". Nenhuma ação nova mora aqui.

## Relação nativa e corpo

- O GitHub tem relação nativa; usa-se ela, não um checklist no corpo.
- O template `<issues.template>` também pede a seção `Blocked by` em texto. O corpo é a fonte primária (existe sempre, aparece no diff); a relação nativa é a verificação cruzada e o que a UI mostra.

## A forma de conexão

`blockedBy`, `blocking` e `subIssues` voltam como conexão (`{nodes, totalCount}`), não como array. Indexar direto (`[.blockedBy[].number]`) falha com `expected an object but got: array`, mensagem que não parece erro de forma e leva a caçar um problema de permissão que não existe.

## Entre repositórios

- A forma número não existe entre repositórios: a aresta é por URL, lida por `url`, porque o número sozinho não diz de qual repositório ele é.
- `#<m>` sozinho no corpo aponta para o repositório local e vira link errado.
- Sub-issue é o fatiamento de uma demanda dentro de um repositório; a dependência entre irmãos é de ordem, e é a de ordem que o `pipeline-execute-ticket` lê para exigir o blocker mergeado.
- Regra deste pipeline, não uma afirmação sobre o que o GitHub aceita: não usamos `--parent` cruzado nem quando ele funcionaria.
