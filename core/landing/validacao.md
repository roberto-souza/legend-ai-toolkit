# Validação da landing — rodada <n>

Modelo de uma rodada de validação, copiado para o handoff pela skill de landing, um arquivo por rodada. Quem preenche é o validador; o rigor de cada nota é o da rubrica dele.

- **Alvo:** <protótipo ou página construída>.
- **Larguras fixas:** <landing.widths>.
- **Varredura:** <landing.sweepWidths>.
- **Data:** <data>.

## Placar

| Seção | Beleza | Clareza | Vendas | Desejo | Média | Rodada anterior | Delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <seção> | <0 a 10> | <0 a 10> | <0 a 10> | <0 a 10> | <n> | <n ou —> | <+n, -n ou —> |

Média geral: <n>

A nota é termômetro, não critério de parada; o rigor é o da rubrica do validador.

## Quebrado

Por impacto, o mais grave primeiro. Cada item diz o que quebra, onde (seção e largura) e a evidência (captura, comando ou saída).

1. <O que quebra> — <seção, largura> — <evidência>.

## Correções

- <Elemento>: <valor ou regra>, precisa a ponto de quem implementa não decidir nada.

## Varredura

Sobreposição de ilustração com texto ou mock, e rolagem horizontal, em **cada** largura da varredura, rolando para baixo **e para cima**.

| Largura | Sobreposição | Rolagem horizontal | Erro de console |
| --- | --- | --- | --- |
| <px> | <nenhuma ou onde> | <não ou onde> | <nenhum ou a mensagem> |

## Teclado e sem JavaScript

- [ ] Esc fecha o que está aberto; o foco entra na camada aberta e volta a quem a abriu; Tab não sai da camada aberta.
- [ ] Toque ou clique fora fecha o que abre por cima.
- [ ] Com a página sem JavaScript, o conteúdo segue visível e nenhum controle aparece sem função; o estado final de um mock é o padrão, e o inicial só existe sob script.
- [ ] Com movimento reduzido nada anima e todo conteúdo fica visível.

## Página no ar

Só quando o alvo é a página construída, em produção.

- [ ] `curl -I http://<domínio>/` responde redirecionamento para https.
- [ ] `www` e o domínio de origem redirecionam para o domínio da página.
- [ ] Endereço inexistente responde 404 com status 404 real.
- [ ] Título, descrição e canonical presentes, e um só H1.

## Parada

- [ ] O dono aprovou.
- [ ] Quebrado está vazio.

Parou quando as duas estão marcadas; a média é registrada, não exigida.
