# Os quatro princípios

- Regras de programação que sobrevivem à troca de projeto: moram no core, e nenhum `rules.md` as reescreve.
- Quem lê: o `pipeline-write-ticket`, para não encomendar o defeito; o `pipeline-execute-ticket`, para não escrevê-lo; o `pipeline-review-diff`, para cobrá-lo.
- Cada princípio traz **gatilho** (o que se observa, de preferência contando), **severidade default** (a do laudo quando o `rules.md` não declara outra), **consequência** (o custo concreto de não seguir) e **não é achado** (a contra-regra, que evita o achado falso: ele custa uma rodada inteira e ensina quem te chamou a te ignorar).
- Princípio sem gatilho é slogan: "isso fere KISS" é irrefutável, logo é achado ruim.

## O repositório ajusta a severidade, nunca o texto

- Um `rules.md` que endurece ou afrouxa um princípio escreve uma linha que o **nomeia** e declara a severidade nova, na forma literal: `- **KISS** vale **[BLOCKER]** neste repositório: <por quê>.`
- Copiar o texto do princípio para o `rules.md` recria a deriva que esta página existe para matar; o `/pipeline-doctor` avisa (item 21).

## 1. Regra do escoteiro (limitada)

Defeito que você encontra no caminho — bug, teste faltando que a política de testes do projeto exige, doc ou module map errado, ponteiro quebrado, configuração inconsistente — é corrigido **nesta branch, neste PR** e registrado em `## Also fixed`. Nunca vira issue, follow-up ou card. **Escoteiro é conserto, não reforma:** refactor que não conserta defeito nenhum fica fora, e "melhorar o que estava feio mas correto" não é escoteiro aqui.

- **Gatilho:** arquivo do diff que não está em "Affected files" nem coberto por um item de `Also fixed`; item de `Also fixed` que não nomeia um defeito; código que entrega algo listado em "Out".
- **Severidade default:** correção sem registro, **IMPORTANT**; item de `Also fixed` que é refactor com nome de correção, **IMPORTANT**; código que entrega algo do "Out", **BLOCKER**.
- **Consequência:** sem a fronteira o PR cresce, a revisão não separa o que é do ticket do que é gosto, e o ticket deixa de ser revisável.
- **Não é achado:** arquivo fora de "Affected files" coberto por um item de `Also fixed` cuja razão procede — corrigir defeito fora do ticket é o esperado, não desvio. Também não é este princípio a regra de estilo que alguns repositórios declaram no `rules.md` com o mesmo nome ("arquivo tocado sai no padrão"): lá o gatilho é padrão, aqui é defeito.

## 2. DRY — duplicação

A mesma **decisão** escrita mais de uma vez. Decisão, não texto parecido.

- **Gatilho, regra de três:** a mesma decisão numa **terceira** ocorrência; ou duas cópias que podem divergir em silêncio, sem que nada quebre.
- **Severidade default:** **IMPORTANT**.
- **Consequência:** a cópia que ninguém lembra de mudar vira o bug da próxima release.
- **Não é achado:** a **segunda** ocorrência — duas ainda não provaram o padrão, e abstração prematura custa mais que a cópia. Duplicação em teste ou fixture, onde a repetição é o que torna o teste legível. Semelhança estrutural sem a mesma decisão por trás.

## 3. KISS — indireção sem segundo consumidor

Camada que existe para um chamador só.

- **Gatilho, contável por grep:** camada, interface, factory, flag de configuração ou parâmetro novo com **exatamente um** chamador no diff, e nenhum segundo previsto no escopo do ticket.
- **Severidade default:** **IMPORTANT**.
- **Consequência:** todo leitor futuro paga o salto de indireção para chegar na única implementação que existe.
- **Não é achado:** o padrão documentado na skill de stack, ou já normal no repositório. **Carregue a skill de stack antes de julgar este princípio** — reclamar da norma documentada é o erro que esta regra mais convida. Não conseguiu carregar a skill: vira linha no `## Summary` do laudo, nunca achado.

## 4. YAGNI — ramo morto

Código que nenhum cenário da spec exercita.

- **Gatilho:** parâmetro, opção ou ramo de código sem cenário correspondente na spec do ticket.
- **Severidade default:** **IMPORTANT**; **BLOCKER** quando o que foi entregue está listado no "Out".
- **Consequência:** código sem cenário não tem como estar certo — ninguém sabe qual comportamento é o esperado, e ele nunca é exercitado até o dia em que alguém o liga.
- **Não é achado:** ramo exigido por contrato externo — API, migração, compatibilidade — que o ticket declara.
