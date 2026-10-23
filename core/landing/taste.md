# Gosto padrão da landing

Padrão de `landing.taste: default`. Um arquivo do projeto em `landing.taste` o substitui por inteiro, sem mescla: quem quer só acrescentar copia este e edita a cópia. Lido pelo designer, pelo copywriter e pelo validador da landing; o dono da página pode vetar qualquer linha. É gosto, não regra do core.

## Evitar

O que deu "cara de IA":

- Selo, plaqueta ou chip em caixa alta com borda acima do título.
- Ícone dentro de quadrado arredondado com fundo tingido; prefira ícone de biblioteca com borda firme.
- Ilustração dentro de caixa, moldura ou cartão: o fundo mata o desenho.
- Ilustração e tela do produto sobrepostas na mesma seção.
- Textura de papel, grão e linha divisória em excesso.
- Hero estático: parece quadro.
- Nome de pessoa, preço e depoimento inventados nos mocks.
- Copy com cara de SaaS genérico.

## Preferir

O que funcionou:

- Menos texto e mais ilustração; grade de itens no lugar de parágrafos empilhados.
- Por seção, ilustração **ou** tela do produto, nunca as duas.
- Hero vivo: os elementos entram em sequência e o laço termina num quadro de repouso.
- Mock em HTML e CSS que reusa o padrão real do produto (o modal e o chip dele).
- Uma página de referência como régua de ritmo e animação.
- Antes e depois fixo (sticky) só no desktop.
- Acordeão de perguntas com abertura e fechamento suaves.

## Movimento

- CSS e IntersectionObserver, sem biblioteca de animação.
- Movimento reduzido respeitado: nada anima e todo conteúdo fica visível.
- Página legível sem JavaScript.

## Arte

- Decida claro, escuro ou os dois **antes** de produzir: ilustração colorida invertida parece negativo.
- Peça camadas isoladas sobre fundo chapado, na resolução nativa, sem ampliar.
- Descreva hachura, raios e espessura de traço para o tamanho final; sem isso o detalhe sai chapado.
- Camada transparente empilhada deixa ver as linhas da de baixo: dê corpo opaco.
- Confira o detalhe cultural com o dono da página.
