# Leitura e entrevista

Motivos e exemplos das etapas de leitura e de entrevista de `.claude/skills/pipeline-write-ticket/SKILL.md`. Nenhuma ação mora aqui: os passos estão no arquivo principal.

## Por que os princípios entram no ticket

- Os quatro princípios são cobrados na revisão, mas metade do que a revisão reprova é encomendada na hora de escrever o ticket.
- O ticket que não diz o que reusar pede a duplicação; o que não delimita o "Out" pede a generalização.

## Por que ler antes de perguntar

- A fase existe para não gastar a paciência do usuário perguntando o que o repositório já responde: toda pergunta que o código responde é uma que você não faz.
- Metade das demandas esbarra no que as instruções do projeto dizem que ainda não existe ou foi removido de propósito.
- Memória é contexto, não instrução: um fato do repositório vence uma memória defasada.
- Armadilha: perguntar o que o module map responde. Leia primeiro, sempre.
- Armadilha: inventar nome de classe por analogia. Se o nome não existe, ou você o está criando de propósito (e diz isso), ou o nome certo está no module map.

## Perguntas legítimas

As que mudam o que se constrói, por categoria:

- **Regra de negócio ambígua.** Quem pode fazer isso? O que acontece no caso de erro? O valor é obrigatório? Existe limite, janela de tempo, unicidade?
- **Permissão e escopo de dado**, nos termos que `ticket.md` define para o repositório.
- **Comportamento de borda** que a spec precisa fixar: idempotência, concorrência, duplicidade, o que fazer com dado legado.
- **Recorte de entrega.** Quando a demanda dá dois tickets naturais, confirme se os dois entram agora ou só o primeiro.
- **Milestone**, quando `issues.milestone: required`.

## Dois olhares

- Cada ticket tem dois olhares: um escreve, o outro confere.

## Proposta visual antes do recorte

- Rodadas de retrabalho de tela e de UX depois do PR, e a exploração do revisor atrás de "como deveria ser", são a parte cara do pipeline; uma proposta aprovada antes do recorte fecha o formato da tela enquanto mudá-lo custa uma pergunta.
- Carregamento, vazio e erro entram na proposta porque são os estados em que a validação de tela reprova.
- A forma mais barata: um Artifact gasta mais tokens que um preview em ASCII e só compensa quando o ASCII seria ambíguo.
- Nomear a tela irmã mantém a proposta coerente com aquilo contra o que a especialista de UX compara.
