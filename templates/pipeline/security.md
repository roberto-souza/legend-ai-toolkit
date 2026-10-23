# Threat model do repositório

Lido por `pipeline-security-audit` e, pelo gatilho, por `pipeline-execute-ticket`. Exige `security.baseline` no profile.

## Perfis de atacante

- **<Perfil>**: <o que tem, o que quer>.

## Eixos

- **<Eixo do sweep>**: <onde olhar, com ponteiro>.
- **supply-chain**: opcional; dependências, runtime, imagens e overrides, pelos comandos de `## Supply chain`. Apague esta linha e a seção `## Supply chain` se o repositório não usa o eixo.

## Triggers

- `<glob>`: <por que mudança aqui chama o revisor de segurança>.

## Supply chain

Lida só pelo eixo `supply-chain`. O revisor roda os comandos de leitura daqui e nunca um comando de correção.

- **Auditoria:** <comando de auditoria de dependência, com o recorte de produção>.
- **Runtime:** <arquivos que fixam a versão do runtime>; <onde as dependências declaram o mínimo delas>.
- **Imagens e pins:** <arquivos com imagem base e versão fixada: Dockerfile, configuração de deploy, workflows>; varredura de imagem: <comando, ou `nenhum`>.
- **Overrides:** <arquivo e chave dos overrides de dependência, ou `nenhum`>.
- **Registro:** <comando que dá a versão `latest` de `<pacote>` e a data de publicação dela>.
- **Guarda:** <comando do gate que confere a versão do runtime, ou `nenhuma`>.
