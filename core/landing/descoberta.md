# Checklist de descoberta da landing

Perguntas que o fluxo de landing responde lendo o repositório antes de produzir. Não se copia: as respostas vão na seção `## Descoberta` da extensão `landing.md`.

## Como responder

- Rode antes do primeiro ticket; os itens marcados `protótipo` vêm antes do protótipo.
- Cada resposta vai em `## Descoberta` do `landing.md` como `- **<Rótulo>:** <resposta>`, com o rótulo da tabela abaixo.
- A resposta é **lida do repositório**: cite o arquivo e a linha, ou o comando e a saída. Nunca suposta.
- Sem fato: `desconhecido — perguntar a <quem>`. Item que não se aplica: `não se aplica — <motivo>`.
- `Conta` e `Redirecionamentos` alimentam `CDN` e `Bordas` de `## Hospedagem`: o fato fica uma vez, na descoberta, e a hospedagem repete só o valor curto.
- A coluna **Antes de** diz em que portão do fluxo a resposta é cobrada.

## Itens

| # | Rótulo | Pergunta | Antes de |
| --- | --- | --- | --- |
| 1 | Domínio | O que responde hoje na raiz e no `www`? Algum curinga, slug reservado ou registro colide? Quem declara DNS e rotas (código ou painel)? | protótipo |
| 2 | Deploy | Como os apps existentes são servidos? Qual o padrão de configuração e o job de deploy? | primeiro ticket |
| 3 | Stack | Algum ADR proíbe framework ou superfície pública? A política é criar ou editar o ADR? Spec e ADR mudam juntos? | protótipo |
| 4 | Spec | Onde a página se registra (épico, entrega, milestone)? Ela responde às perguntas de escopo do produto ou fica fora do MVP? | primeiro ticket |
| 5 | Guardas | Quais guardas valem: glossário ou palavras proibidas, orçamento de tamanho de documento, extensões no lint e no formatador, typecheck do framework novo? | protótipo |
| 6 | Segurança | Formato da política de conteúdo (CSP), `robots` dos outros apps, cabeçalhos, política de script inline? | primeiro ticket |
| 7 | Privacidade | Onde estão política e termos? Qual a regra de terceiros (nomear ou só categoria)? Alguma frase que a medição vai tornar falsa? | protótipo |
| 8 | Medição | Já há analytics? A CDN injeta algo sozinha? Como contar o clique da ação sem dado pessoal? | primeiro ticket |
| 9 | Bots | Qual a política para bots de IA, `robots` gerenciado e proteção contra bot da CDN? O provedor de infraestrutura expõe isso? Que permissão o token precisa? | primeiro deploy |
| 10 | Marca | Tokens, fonte própria, logos, favicon, manifest; componentes do produto a imitar nos mocks? | primeiro ticket |
| 11 | Convenções | Nome do app, porta de dev, script de dev, module map, skill de stack, template de ticket, lista de unidades? | primeiro ticket |
| 12 | Segredos | Nomes das variáveis, ambiente do repositório e o exemplo de variáveis versionado? | primeiro deploy |
| 13 | Conta | O que precisa estar habilitado na conta da CDN e do analytics antes do primeiro deploy (produto, plano, binding, permissões do token)? Falta algo que só derruba o deploy? | primeiro deploy |
| 14 | Toolchain | O framework escolhido funciona com as versões do toolchain do repositório: linguagem tipada, formatador e o plugin dele para a extensão do framework, lint, typecheck do framework, lista de arquivos do gate? | primeiro ticket |
| 15 | Redirecionamentos | `http` redireciona para `https`? E o `www` e o domínio de origem? Quem declara, e como se verifica (`curl -I http://<domínio>/`)? | primeiro deploy |
