# Corpo do ticket

Motivos e exemplos das regras de `## Fase 4 — Escrever o corpo` de `.claude/skills/pipeline-write-ticket/SKILL.md`. Nenhuma ação mora aqui: os passos estão no arquivo principal.

## Por que o template manda

- O GitHub renderiza o form do template e o `pipeline-execute-ticket` faz o parse do corpo por cabeçalho: ordem ou título diferente quebra o parse.
- No ticket conjunto, o campo de unidade traz as unidades separadas por vírgula (`api, web-app`) e o título as une por `+` (`[api+web-app]`).

## Affected files é contrato

- É contra ele que o revisor mede desvio de escopo; arquivo tocado fora da lista é sinalizado.
- Omitir aqui vira conflito de merge lá, por isso a lista é generosa.
- Caminho de dois repositórios na lista é o sintoma de ticket que atravessou; um repositório por ticket.

## O que reusar

- Ticket que esconde a peça existente encomenda a duplicação: o executor entrega exatamente o que foi pedido e o revisor reprova pelo princípio 2.
- É uma rodada perdida por defeito de spec, não de código.

## O Out

- O "Out" é onde a generalização morre: o "para quando precisarmos de X" entra nele com nome, não fica subentendido.
- Sem ele o executor generaliza e o revisor cobra pelos princípios 3 e 4, com BLOCKER quando o que foi entregue estava listado ali.

## Cenários e marcador

- Frase de abertura como "sem runner, percurso humano" não substitui o marcador: com `gate.tests: true`, o executor e o revisor cobram teste de todo cenário sem ele.
- Com `gate.tests: false` o marcador é dispensável porque todo cenário é o que um humano percorre (a tela, a rota, o comando); ele substitui o teste, então se escreve verificável.

## Referências entre tickets

- Nenhuma issue existe quando o corpo é escrito, então o ticket do recorte citado vai como `#<slug>`.
- O `#<slug>` do dependente fica até o fim da criação porque o "Out" costuma apontar para ele, que ainda não existe quando o blocker é criado.

## Critério com verificação

- O método de verificação escrito faz o executor e o revisor checarem a mesma coisa do mesmo jeito, então o "pronto" não é redescoberto na revisão; é a forma em que o revisor recebe o critério como checklist.
- Exemplo de comando: ``- [ ] `pnpm check` passes — verify: `pnpm check` exits 0``.
- Exemplo de captura: `- [ ] The empty state is shown when the list has no rows — verify: screen capture of the list at 1280x800 in the light theme shows the empty-state card`.

## Proposta visual no corpo

- O executor e o revisor leem só o corpo da issue, nunca a conversa; aprovação que vive só na entrevista não existe para eles (o mesmo motivo da linha de autorização do ticket conjunto).
- A linha literal é o que o `/pipeline-execute` procura com grep antes de codificar tela.
