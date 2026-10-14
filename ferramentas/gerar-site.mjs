// Gera o site estático manobrotherhood.com a partir de shared/mano-legal.ts (mesmo texto do app).
// Uso: node gerar-site.mjs <mano-legal.ts> <pasta-de-saida> <logo.png>
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const [legalPath, out, logo] = process.argv.slice(2)
const legal = await import(pathToFileURL(legalPath).href)
const { MANO_LEGAL_DOCUMENTS: docs, MANO_LEGAL_VERSION: version, MANO_SUPPORT_EMAIL: email, MANO_DELETION_EMAIL: deletionMail, MANO_CONTROLLER: controller } = legal

const esc = text => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const dataBr = version.split("-").reverse().join("/")

const css = `:root{--bg:#f4f1e8;--fg:#171814;--muted:#5b5a52;--card:#faf8f2;--line:#ded5c0;--link:#224f5a;--accent:#a7181d;--btn-fg:#f4f1e8;--btn-bg:#171814}
@media (prefers-color-scheme:dark){:root{--bg:#141512;--fg:#ece8dc;--muted:#a9a596;--card:#1d1f1a;--line:#34362e;--link:#8cc3cf;--accent:#e07a7e;--btn-fg:#141512;--btn-bg:#ece8dc}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow-wrap:anywhere}
main{max-width:760px;margin:0 auto;padding:28px 16px 64px}
header.top{display:flex;align-items:center;gap:14px;margin-bottom:8px}
header.top img{width:56px;height:56px;border-radius:50%}
header.top strong{font-size:22px;letter-spacing:.5px}
header.top span{display:block;color:var(--muted);font-size:14px}
h1{font-size:clamp(26px,5vw,36px);line-height:1.2;margin:24px 0 4px}
h2{font-size:22px;line-height:1.3;margin-top:32px}
p.version{color:var(--muted);margin-top:0}
nav{display:flex;gap:4px 14px;flex-wrap:wrap;margin:12px 0 4px}
a{color:var(--link)}
nav a{display:inline-flex;min-height:44px;align-items:center}
a:focus-visible{outline:3px solid var(--link);outline-offset:3px}
.action{display:inline-flex;min-height:48px;align-items:center;color:var(--btn-fg);background:var(--btn-bg);border-radius:12px;padding:12px 18px;margin-top:16px;text-decoration:none;font-weight:700}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin-top:20px}
.lead{font-size:20px}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:15px}`

const nav = `<nav aria-label="Documentos"><a href="/">Início</a><a href="/privacidade/">Privacidade</a><a href="/termos/">Termos</a><a href="/excluir-conta/">Excluir conta</a></nav>`
const page = (title, description, body) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="/mano.png">
<link rel="stylesheet" href="/estilo.css">
</head>
<body>
<main>
<header class="top"><img src="/mano.png" alt="Brasão do MANO"><div><strong>MANO</strong><span>Viaje sozinho. Nunca desacompanhado.</span></div></header>
${nav}
${body}
<footer>Responsável: ${esc(controller)} · Contato: <a href="mailto:${esc(email)}">${esc(email)}</a></footer>
</main>
</body>
</html>
`
const docBody = (doc, extra = "") => `<h1>${esc(doc.title)}</h1>
<p class="version">Versão de ${esc(dataBr)}</p>
${extra}
${doc.sections.map(section => `<section><h2>${esc(section.title)}</h2>
${section.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join("\n")}
</section>`).join("\n")}`

mkdirSync(out, { recursive: true })
writeFileSync(join(out, "estilo.css"), css)
copyFileSync(logo, join(out, "mano.png"))
writeFileSync(join(out, "index.html"), page("MANO — viagens de moto", "Navegação, comboio, acompanhamento e ajuda na estrada para quem viaja de moto.", `<h1>Viaje sozinho. Nunca desacompanhado.</h1>
<p class="lead">O MANO é o aplicativo de quem viaja de moto: navegação com radares e limites de velocidade, comboio com os amigos, acompanhamento para quem fica em casa e pedido de ajuda à comunidade na estrada.</p>
<div class="card"><p><strong>Em breve no Google Play.</strong> Estamos em fase de testes.</p></div>
<h2>Documentos</h2>
<p><a href="/privacidade/">Política de privacidade</a> · <a href="/termos/">Termos de uso</a> · <a href="/excluir-conta/">Como excluir sua conta</a></p>`))
const docsDir = { privacy: "privacidade", terms: "termos", deletion: "excluir-conta" }
for (const [key, dir] of Object.entries(docsDir)) {
  const doc = docs[key]
  const extra = key === "deletion" ? `<a class="action" href="${esc(deletionMail)}">Enviar pedido por e-mail</a>` : ""
  mkdirSync(join(out, dir), { recursive: true })
  writeFileSync(join(out, dir, "index.html"), page(`MANO — ${doc.title}`, doc.sections[0].paragraphs[0].slice(0, 155), docBody(doc, extra)))
}
writeFileSync(join(out, "404.html"), page("MANO — página não encontrada", "Página não encontrada.", `<h1>Página não encontrada</h1><p>Confira o endereço ou volte para o <a href="/">início</a>.</p>`))
// Links do app que ainda não existem neste site levam ao início, sem erro de "não encontrada".
writeFileSync(join(out, "_redirects"), "/privacy /privacidade/ 301\n/terms /termos/ 301\n/delete-account /excluir-conta/ 301\n")
writeFileSync(join(out, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n")
console.log("site gerado em", out)
