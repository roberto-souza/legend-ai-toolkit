# Armadilhas do pipeline-write-ticket

Sintoma e motivo das armadilhas das Fases 4 e 5 de `.claude/skills/pipeline-write-ticket/SKILL.md`. As das Fases 0 a 3 estão em `.claude/skills/pipeline-write-ticket/reference/leitura-e-entrevista.md` e `.claude/skills/pipeline-write-ticket/reference/fatiamento.md`. A condição de parada de cada uma está no passo que ela afeta.

## Fase 4

- **Ticket sem "Out" no escopo.** É o campo que impede o agente de inventar feature, e é o que dá BLOCKER ao revisor pelo princípio 4 quando ele inventa mesmo assim.
- **Escrever a issue no idioma da conversa.** Traduzir depois custa mais do que já nascer certo.

## Fase 5

- **`#42` querendo dizer outro repositório.** Com `topology: polyrepo` a referência cruzada é `<owner>/<name>#42`, sempre, e a aresta nativa é por URL.
- **`gh issue create` duplicado.** Sem `--write-id`, retry cego cria issue gêmea.
- **Label inexistente.** `gh issue edit` falha em label que não existe em vez de criar. O estado do trabalho vive no campo **Status do Project**, não em label.
