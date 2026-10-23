# Ilustrador

Recrutamento, modelo de pedido e armadilhas do papel `.claude/skills/pipeline-maestro/roles/ilustrador.md`. Quem recruta e pede é a skill de landing, quando o profile declara `team.roles.illustrator`; o ilustrador não é papel de PR: sem selo, sem roteiro de validação e sem entrada no roteamento do maestro.

## Recrutar o ilustrador

1. Crie a pasta de partida: `mkdir -p <raiz>/<landing.handoff>/ilustracoes`, com `<raiz>` igual à raiz do checkout principal (`git rev-parse --show-toplevel`, no Ground).
2. Recrute **sem `--role`**, na pasta do handoff: `maestri recruit "[ILUSTRADOR] <team.roles.illustrator.tool>" --command "<team.roles.illustrator.command>" --dir <raiz>/<landing.handoff>/ilustracoes`, com `{root}` trocado por `<raiz>`.
3. O "trust this folder" se responde como nos validadores: `maestri ask "[ILUSTRADOR] <team.roles.illustrator.tool>" --raw "\n"`.
4. Mande o papel `.claude/skills/pipeline-maestro/roles/ilustrador.md`: `maestri ask "[ILUSTRADOR] <team.roles.illustrator.tool>" "<conteúdo do papel>"`; só depois, o primeiro pedido.
5. Sem `team.roles.illustrator` (ou sem `team:`): não há ilustrador; a skill de landing pede a imagem ao humano.

## Modelo de pedido

O orquestrador grava cada pedido em `<raiz>/<landing.handoff>/ilustracoes/pedido-ilustracao-<NN>.md`, com `<NN>` de dois dígitos, e manda o caminho ao ilustrador. Campos, todos obrigatórios:

- **Número:** `<NN>`.
- **Onde entra:** a seção da página e o tamanho final em px (`<largura> × <altura>`).
- **Referência de estilo:** os arquivos do handoff que mostram o estilo (`<arquivo>`).
- **Paleta:** `<valores>`, copiados do briefing ou do taste.
- **Proibições:** copiadas de `## Proibições` da extensão `landing.md` e do taste.
- **Camadas:** uma linha por camada: nome do arquivo, descrição, posição relativa e tamanho final em px.
- **Fundo chapado:** `<cor>`, uma cor só, sem sombra nem gradiente.
- **Resolução nativa:** `<px>`, sem ampliar nem reamostrar para cima.
- **Formato de saída:** `<formato>`; os nomes dos arquivos vêm de **Camadas**.
- **Pasta de saída:** `p<NN>/`, dentro de `<raiz>/<landing.handoff>/ilustracoes`.
- **`prompts.md`:** na pasta de saída, com o prompt exato e o tamanho real de cada arquivo.
- **Aceite:** verificável: quantidade de arquivos, dimensões de cada um iguais à resolução nativa pedida (sem ampliar) e fundo chapado uniforme.

## Armadilhas do ilustrador

- Ferramenta que pede aprovação a cada gravação fora da pasta de início: leia o script antes de aprovar.
- Terminal que cai no banner de boas-vindas e perde o primeiro lote: confira com `maestri check` e reenvie o pedido.
- Ampliação silenciosa de imagem pequena: confira o tamanho real em `prompts.md` contra a resolução do pedido.
- Elemento pequeno que sai chapado: o pedido descreve hachura, raios e espessura de traço para o tamanho final.
- Camada transparente que deixa ver a de baixo: dê corpo opaco com a cor do fundo; as ferramentas opcionais de landing do toolkit fazem isso, se instaladas.
- Cena inteira entregue quando se pediram camadas: recuse e reenvie o pedido com as camadas listadas.
- Arte colorida invertida para tema escuro "parece negativo": decida o tema antes de pedir arte.
