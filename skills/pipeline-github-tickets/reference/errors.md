# Erros

Motivos e catálogo dos passos de `.claude/skills/pipeline-github-tickets/SKILL.md`, seções "Escrita sem resposta" e "Erros". Nenhuma ação nova mora aqui.

## Escrita sem resposta

`gh` não tem `--write-id`. O risco é o oposto do que parece: a escrita **acontece** e a resposta se perde, então o retry cego duplica.

## Catálogo

- `no issues found` / `no pull requests found`: número ou filtro errado; releia o alvo, não tente outro número.
- `could not add label: 'X' not found`: a label não existe. Crie com `gh label create` ou pare; nunca troque por label parecida.
- `--type` com nome inexistente: confira os tipos habilitados com `gh api /orgs/<board.owner>/issue-types`; nunca invente um tipo.
- `HTTP 403` em `user-attachments`: repo privado, use `gh api <url>`.
- `unknown flag: --add-blocked-by` ou `--type`: `gh` antigo. Atualize; até lá use só a seção do corpo e diga ao usuário o que não foi gravado.
- `gh: Not Found (HTTP 404)` em repo que existe: falta escopo no token. `gh auth refresh`.
- `failed to create linked branch: API returned empty branch name`: a branch já existe. Ao retomar, é esperado: `git switch <branch>`.
- `item-edit` com exit 0 e nada mudou: `$ITEM` veio vazio. Volte ao passo 1 de `.claude/skills/pipeline-github-tickets/SKILL.md`, seção "Mover o card". Com `topology: polyrepo`, a causa mais comum é o filtro `.content.repository` comparado com o nome curto em vez do `<owner>/<name>`.
- `could not resolve to an Issue` num `--add-blocked-by <número>`: o alvo está em outro repositório, e entre repositórios a aresta é por URL, nunca por número.
- `gh issue create` ou `gh issue edit` acertando o repositório errado: faltou `--repo <owner>/<name>`. O `gh` resolve pelo diretório atual, e num polyrepo o diretório atual quase nunca é o do irmão que você quer tocar.
