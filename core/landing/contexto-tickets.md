# Contexto comum dos tickets da landing

Modelo do contexto que todo escritor de ticket da landing lê antes de escrever, copiado para o handoff pela skill de landing antes do primeiro escritor. Um lugar só para o que mais de um ticket precisa saber.

## Demanda

<Um parágrafo: o que a página entrega, para quem e em que prazo.>

## Material de referência

- <Arquivo ou link> — <para que serve> — <quanto vale pela hierarquia de fontes>.

## Decisões do solicitante

1. <Decisão> (<data>).

## Decisões do orquestrador (a confirmar)

1. <Decisão> — alternativa: <a outra opção> — se o solicitante discordar: <o que muda>.

## Contrato entre tickets

Fonte única dos nomes que mais de um ticket usa; cada corpo cita estes valores e não os redefine; mudar aqui obriga rever os corpos afetados.

- **Arquivos e donos:** <arquivo compartilhado> → <ticket que o cria>; os outros só importam.
- **Tokens:** <nomes dos tokens de cor, espaço e tipografia>.
- **Classes e animações:** <classes de revelação, keyframes, ordem de entrada>.
- **Listas fechadas:** <valores aceitos, como as origens do canal de ação>.
- **Contagens:** <números que dois lugares repetem, como as perguntas do FAQ e as do dado estruturado>.
- **Política de script:** <empacotado ou inline>; origem nova entra na política de segurança no mesmo PR.
- **Dependência entre tickets:** <ticket> → <ticket que precisa estar mergeado antes>.

## Critérios fixos

Repita estes critérios em todo corpo de ticket de landing.

- Orçamento de linhas: `<landing.lineBudget>` é só teto por arquivo, contado depois de `<landing.formatCommand>` (sem comando, o ticket diz que a contagem não foi formatada); não muda o corte de ~400 linhas por ticket, e seção maior que 400 linhas vira dois tickets.
- Componente interativo funciona com teclado (Esc, foco, Tab) e sem JavaScript.
- Spec, depois protótipo, depois copy. Onde divergem, vale a mais à esquerda.
- Sem sobreposição nem rolagem horizontal em `<landing.widths>` e `<landing.sweepWidths>`.
- Ticket de borda ou infraestrutura: `curl -I http://<domínio>/` responde redirecionamento para https.
- O ticket do topo e do hero é validado antes de os de seção serem empilhados.

## Recorte

| Ticket | Escopo | Linhas estimadas | Blocked by |
| --- | --- | --- | --- |
| <título> | <o que entra> | <n> | <ticket ou —> |
