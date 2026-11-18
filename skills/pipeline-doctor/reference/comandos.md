# Doctor: comandos

Os comandos dos itens longos do checklist de `.claude/skills/pipeline-doctor/SKILL.md`. Rode cada bloco da raiz do repositório (bash), com os `<...>` trocados pelos valores do profile, e leia a saída pela regra do item. Nenhuma checagem nova mora aqui.

## Landing (item 27)

```bash
L=.claude/pipeline/landing.md
if test -f "$L"; then
  for t in Produto Público Ação Proibições Fontes Hospedagem Descoberta; do grep -qx "## $t" "$L" || echo "FALHA landing.md sem ## $t"; done
  awk '/^## /{d=($0=="## Descoberta")} !d && /<[^>]*>/{print "AVISO "FILENAME":"FNR": "$0}' "$L"
  D=$(awk '/^## /{d=($0=="## Descoberta"); next} d' "$L")
  if ! printf '%s\n' "$D" | grep -q '^- \*\*[^*]*:\*\*'; then echo "OK descoberta ainda não feita"; else
    for r in Domínio Deploy Stack Spec Guardas Segurança Privacidade Medição Bots Marca Convenções Segredos Conta Toolchain Redirecionamentos; do
      printf '%s\n' "$D" | grep -q "^- \*\*$r:\*\*" || echo "AVISO descoberta sem o rótulo $r"
    done
  fi
else echo "FALHA landing.md ausente"; fi
test -d "<landing.app>" || echo "AVISO <landing.app> não existe"; test -d "<landing.handoff>" || echo "AVISO <landing.handoff> não existe"
for f in .claude/pipeline/core/landing/{briefing,validacao,manifesto,contexto-tickets,descoberta,taste,rubrica}.md \
  .claude/skills/pipeline-landing-flow/SKILL.md .claude/skills/pipeline-landing-flow/reference/{portoes,pagina-construida,armadilhas}.md \
  .claude/agents/pipeline-landing-{researcher,domain-researcher,seo,teardown,copywriter,designer,validator}.md \
  .claude/skills/pipeline-maestro/{roles,reference}/ilustrador.md; do test -f "$f" || echo "FALHA $f ausente"; done
test -f .claude/skills/pipeline-landing/SKILL.md || echo "FALHA skill pipeline-landing ausente"
grep -L '^model:' .claude/skills/pipeline-landing/SKILL.md
grep -L '^disable-model-invocation: true' .claude/skills/pipeline-landing-flow/SKILL.md
grep -L '^## Entrada' .claude/skills/pipeline-landing-flow/SKILL.md
case "<landing.taste>" in ""|default) ;; *) test -f "<landing.taste>" || echo "FALHA landing.taste: <landing.taste> não existe" ;; esac
git check-ignore -q "<landing.handoff>/" && echo "handoff ignorado pelo git" || echo "handoff versionado"
```

## Triagem (item 30)

```bash
node -e '
const fs = require("fs");
const O = ".claude/pipeline/observability.md";
if (!fs.existsSync(O)) { console.log("FALHA observability.md ausente"); process.exit(); }
const text = fs.readFileSync(O, "utf8");
for (const t of ["Provedor", "Triagem", "Vínculo", "Dado pessoal"]) if (!text.split("\n").includes(`## ${t}`)) console.log(`FALHA observability.md sem ## ${t}`);
const label = name => text.match(new RegExp(`^- \\*\\*${name}:\\*\\* *(.*)$`, "m"))?.[1];
for (const r of ["Organização", "Projetos", "Servidor MCP", "Ambiente", "Janela", "Tags", "Id", "Issue", "PR", "Regra"]) if (label(r) == null) console.log(`FALHA observability.md sem o rótulo ${r}`); else if (!label(r).replace(/[`.]/g, "").trim()) console.log(`FALHA rótulo ${r} sem valor`);
text.split("\n").forEach((l, i) => { if (/<[^>]*>/.test(l) && /^- \*\*/.test(l)) console.log(`FALHA ${O}:${i + 1} ainda com <...>`); });
if (label("Id") != null && !label("Id").includes("{n}")) console.log("FALHA rótulo Id sem {n}");
for (const r of ["Issue", "PR"]) if (label(r) != null && !label(r).includes("{id}")) console.log(`FALHA rótulo ${r} sem {id}`);
const name = (label("Servidor MCP") ?? "").replace(/[`.]/g, "").trim();
let mcp;
try { mcp = JSON.parse(fs.readFileSync(".mcp.json", "utf8")); } catch { console.log("FALHA .mcp.json ausente ou inválido"); process.exit(); }
const server = mcp.mcpServers?.[name];
if (!server) { console.log(`FALHA .mcp.json sem mcpServers.${name}`); process.exit(); }
if (server.type !== "http") console.log(`FALHA mcpServers.${name}.type não é http`);
for (const k of ["headers", "env"]) if (server[k] != null) console.log(`FALHA mcpServers.${name}.${k}: credencial no .mcp.json`);
const url = String(server.url ?? "");
if (!url.startsWith("https://mcp.sentry.dev/mcp")) console.log(`AVISO mcpServers.${name}.url fora de https://mcp.sentry.dev/mcp (vale só com provider: sentry)`);
const projects = (label("Projetos") ?? "").split(",").filter(p => p.replace(/[`.]/g, "").trim()).length;
if (projects > 1 && url.replace(/^https:\/\/[^/]+\/mcp\/?/, "").split("/").filter(Boolean).length > 1) console.log(`FALHA mcpServers.${name}.url escopada a um projeto, com ${projects} em Projetos`);
console.log(`OK servidor ${name}`);
'
{ git grep -nIE 'sntry[us]_[A-Za-z0-9]|SENTRY_[A-Z_]*TOKEN *[:=] *["'"'"']?[^$"'"'"'{[:space:]]' -- . ':!*.lock'; grep -nE 'sntry[us]_[A-Za-z0-9]|"[A-Z_]*(TOKEN|AUTH)[A-Z_]*" *: *"[^"$]' .mcp.json .claude/settings*.json 2>/dev/null; } | cut -d: -f1,2 | sort -u | sed 's/^/FALHA token em /'
git ls-files --error-unmatch .mcp.json >/dev/null 2>&1 || echo "AVISO .mcp.json fora do git"
for f in .claude/skills/pipeline-triage/SKILL.md .claude/skills/pipeline-triage-errors/SKILL.md .claude/skills/pipeline-triage-errors/reference/laudo.md; do test -f "$f" || echo "FALHA $f ausente"; done
grep -q '^model:' .claude/skills/pipeline-triage/SKILL.md 2>/dev/null || echo "FALHA pipeline-triage sem model:"
grep -q '^disable-model-invocation: true' .claude/skills/pipeline-triage-errors/SKILL.md 2>/dev/null || echo "FALHA pipeline-triage-errors sem disable-model-invocation: true"
grep -q '^## Entrada' .claude/skills/pipeline-triage-errors/SKILL.md 2>/dev/null || echo "FALHA pipeline-triage-errors sem ## Entrada"
```
