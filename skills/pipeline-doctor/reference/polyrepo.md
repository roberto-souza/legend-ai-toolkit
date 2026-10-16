# Doctor em polyrepo

Os motivos das checagens que só existem com `topology: polyrepo` ou `closing.mode: close-references-mutation`. O checklist está em `.claude/skills/pipeline-doctor/SKILL.md`.

## Irmãos (item 7)

- Clone de irmão ausente é `AVISO`, não `FALHA`: o pipeline deste repositório continua funcionando sem ele.
- Diretório que existe com outro remote é `FALHA`: o `dir` do profile aponta para o clone errado.

## Workflow de fechamento (item 8)

- Sem o workflow a issue não fecha no merge, porque o GitHub ignora o `Closes #N` quando a base não é a branch default.
- Por isso o workflow precisa reagir a `pull_request` `closed` na `<branches.base>`.
