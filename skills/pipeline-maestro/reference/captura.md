# Captura no portal

## Captura pelo script

Os motivos dos passos de `.claude/skills/pipeline-maestro/roles/executor.md`, seção "Pedido de capturas".

- O Chromium headless tem foco: transição, animação e retry de requisição rodam, e o artefato do portal sem foco deixa de existir.
- A espera pelo elemento visível substitui o `getAnimations()`: a captura sai quando a tela está de fato no estado do cenário, sem mexer em `transform`.
- A troca de `Origin` e `Host` no proxy existe porque a API deriva o tenant e a origem permitida do front: o build servido numa porta própria, sem a troca, seria recusado ou cairia no tenant errado.
- O build servido não é servidor de dev e não colide com o checkout principal: porta livre, fora de `<team.portals>`, encerrado no fim do pedido.
- Cenário uma vez (variante base) mais a varredura do estado inicial nas quatro variantes, para não multiplicar cada cenário por quatro.
- O script vive no `<scratchpad>` do executor, fora do repositório: verificação é validação, não spec.
- O que o headless não prova (atalho de teclado, foco, colar) entra em `## Fora do script` do manifesto e vira passo pontual de portal.

## Captura transitória

O `getAnimations()` vale só para os passos pontuais de portal; a conferência do maestro vale para toda captura de estado transitório. Com a janela do portal sem foco, transições e animações CSS congelam: painel pela metade ou modal transparente. Nunca desligar o `transform` no DOM, porque desloca painéis. Modal, menu, painel e toast precisam de prova com o elemento aberto. `document.getAnimations().forEach(a => a.finish())` antes do `maestri portal screenshot` encerra a animação antes da captura. A linha da nota descreve o que a imagem mostra (título do modal, itens do menu, texto do toast), nunca o esperado.

O maestro abre cada captura antes de aceitar a aprovação. Linha que afirma o elemento aberto com imagem sem ele reprova o roteiro, não o PR; o passo é redespachado e a divergência fica na nota.

## Captura nova

`maestri portal screenshot` devolve um caminho temporário; o roteiro inclui `mkdir -p` e `cp` para preservar a imagem na pasta de capturas. Um caminho nunca serve a outro passo. A captura de celular vem depois do `resize` e do `ua`.

## Artefato do portal

Animação congelada pode deixar menu ou painel parado mesmo depois de `getAnimations().finish()`. Um achado de sobreposição que o executor não reproduz é artefato da ferramenta, não defeito do PR.

A captura do script do executor (`.claude/skills/pipeline-maestro/reference/captura.md`, seção "Captura pelo script") já é a evidência principal: usa a build da branch do PR servida pelo executor, contra a API do checkout principal, com foco.

No navegador, a divergência só existe num passo pontual de portal. O maestro pede ao executor que reproduza o passo no script, na mesma pasta, como linha nova do manifesto `capturas.md`; o executor acrescenta ao `## Test plan` do PR o caminho da captura e o que ela mostra. A captura do script prevalece, o achado do validador ou da UX é descartado e a nota registra "artefato do portal".

No aparelho não há script: redespache o passo com captura nova; só é artefato do portal quando a captura nova não mostra a divergência, e então o maestro pede ao executor, por `maestri ask`, que registre no `## Test plan` do PR o caminho e o que a captura nova mostra. A divergência reproduzida é achado.
