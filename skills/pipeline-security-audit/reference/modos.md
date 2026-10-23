# Modos da revisão de segurança

## Tabela dos modos

| Modo | Quem chama | Recebe | Entrega |
| --- | --- | --- | --- |
| **diff** | `pipeline-execute-ticket`, Fase 5 | spec do ticket inline, caminho absoluto do laudo, número da rodada, range (default `origin/<branches.base>...HEAD`); na rodada 2 em diante: o range do delta e os próprios achados anteriores, triados | laudo com veredito |
| **sweep** | `/pipeline-security`, na sessão principal | caminho absoluto do laudo, subconjunto de eixos (opcional) | laudo consolidado, sem veredito |
| **axis** | o orquestrador do sweep, um subagente por eixo | um eixo de `security.md`, caminho absoluto do laudo parcial | laudo parcial do eixo, sem veredito |
| **axis `supply-chain`** | o orquestrador do sweep, só quando `security.md` lista o eixo | o eixo, caminho absoluto do laudo parcial; os fatos vêm de `## Supply chain` do `security.md` | roda os comandos de leitura declarados e entrega o laudo parcial com `## Supply chain`, sem veredito |

O modo diff nunca roda o eixo `supply-chain`: o gate do `/pipeline-execute` não audita dependência, e a lista de `## Triggers` não o chama.

## Por que o diff soma o que já existe

A classe que escapa da revisão de diff é a interação entre peças corretas isoladamente: uma configuração permissiva num arquivo e um orçamento que confia nela noutro, que nunca caem no mesmo diff.

## Armadilhas

- **Julgar o diff isolado.** O buraco que importa costuma estar na soma do diff com o que já existe.
- **Rodar o sweep como subagente.** Subagente não lança subagente: o sweep roda na sessão principal do `/pipeline-security`.
- **Rodar comando de correção no eixo `supply-chain`.** `audit --fix`, `update`, `install` e `dedupe` mudam o lockfile
  e as dependências instaladas: o revisor não edita arquivo nenhum, e a correção é ticket. Só
  rodam os comandos de leitura que `## Supply chain` declara.
