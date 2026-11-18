# Nota de estado: passos

## Passos

Continuação dos passos 1 a 5 de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Nota de estado".

6. A linha `PR #<pr> aberto para #<n>: <url> — <AAAA-MM-DD>` em `## Em execução` é o registro provisório do sentinela, trocada no `PILHA PRONTA` pelo item do passo 3 de `.claude/skills/pipeline-maestro/SKILL.md`, seção "Nota de estado".
7. Conte nos itens do PR as voltas pós-PR de cada tela (`REPROVADO`, `AJUSTAR`, review humano); só achado de tela tem volta (PR só de API não tem). Toda correção mandada ao executor diz `volta <k> da tela <rota>`.
8. A sessão compacta no `CLAUDE_CODE_AUTO_COMPACT_WINDOW` que o install põe em `.claude/settings.json` (`.claude/pipeline/core/profile-schema.md`, seção "O que o install põe no `settings.json`"), e o gancho `resume` aponta a nota depois da compactação; ao fim de cada pilha, deixe a nota em dia para retomar numa sessão nova se a compactação perder o fio.
