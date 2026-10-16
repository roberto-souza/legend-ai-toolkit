# Entrada das skills internas

Onde uma skill interna começa: quem a carrega, quando o pin de modelo para a sessão e o que muda fora do Claude Code. Cada skill interna aponta para cá; a regra mora só aqui.

## Comando e skill interna

- Skill interna (`user-invocable: false`) é carregada pelo comando dono dela.
- Carregada por qualquer outro caminho, numa ferramenta que tem comandos: pare e invoque o comando dono com os mesmos argumentos. O comando carrega o pin de modelo e aponta para o checklist; a skill sozinha pula o pin.
- Ferramenta sem comandos lê o `SKILL.md` direto, por caminho (o arquivo de entrada dela aponta para lá); o caminho dela não muda.
- Subagente que recebe a skill por `skills:` ou a lê por caminho não para: roda no modelo do frontmatter do próprio agent.

## Pin de modelo

- O pin é o `model` e o `effort` do frontmatter do comando dono.
- No Claude Code, sessão fora desse `model`/`effort` não orquestra: pare antes de qualquer ação (board, branch, entrevista, despacho), diga ao usuário o modelo e o effort que o comando pina e peça `/model` e uma nova invocação.
- Motivo: quem orquestra lança subagentes, e subagente não lança subagente, então a orquestração não se delega. Os subagentes sobem no modelo do frontmatter do agent deles.

## Fora do Claude Code

- Não há pin: siga no modelo da sessão e avise o usuário quando ele não for o pinado; a parada de `## Pin de modelo` não vale.
- Subagente que lá não existe, ou que está indisponível na sessão, tem o papel feito pela sessão, com as mesmas regras.
- Exceção: a revisão em contexto limpo mantém a regra da skill dona; a sessão nunca revisa o próprio trabalho.
