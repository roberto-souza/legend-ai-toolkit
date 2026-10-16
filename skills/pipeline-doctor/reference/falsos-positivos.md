# Falsos positivos do doctor

Por que alguns achados parecem falha e não são, ou parecem seguros e não são. O checklist está em `.claude/skills/pipeline-doctor/SKILL.md`.

## Plugin habilitado em outro projeto (itens 15 e 20)

- `claude plugin list` não é evidência: outros projetos da máquina continuam com o plugin e o cache é compartilhado, então a lista global mostra o plugin mesmo com este repositório fora dele.
- O plugin antigo `pipeline@agent-core` é problema aqui porque o pipeline mora neste repositório: carregado, o plugin duplica skills e agents (`pipeline:reviewer` ao lado de `pipeline-reviewer`).
- Só contam os arquivos de settings que habilitam plugin para esta pasta: `.claude/settings.json`, `.claude/settings.local.json` e `~/.claude/settings.json`.

## Fatiamento planejado (item 19)

- O fatiamento planejado do `ticket.md`, o que o `/pipeline-ticket` faz, não é follow-up e fica: tanto a aresta `Blocked by` quanto a sub-issue por `--parent`.
- Follow-up é a instrução que manda abrir ticket para um defeito achado durante a execução.

## O que o grep do item 21 pega e não é cópia

- Linha que já é só severidade: declara a severidade de um princípio sem reescrever o texto dele.
- Regra ancorada num caminho deste repositório (`<caminho>/`, um package): diz onde procurar, o que o core não pode saber.
- A regra de estilo que alguns repositórios chamam de "regra do escoteiro" (arquivo tocado sai no padrão): é o padrão do arquivo tocado, gatilho diferente do princípio 1; vale renomeá-la para não confundir quem lê.
