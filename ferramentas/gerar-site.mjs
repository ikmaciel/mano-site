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


const nav = `<nav aria-label="Documentos"><a href="/">Início</a><a href="/privacidade/">Privacidade</a><a href="/termos/">Termos</a><a href="/excluir-conta/">Excluir conta</a></nav>`
const page = (title, description, body) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="/mano.png">
<link rel="stylesheet" href="/base.css?v=20261127">
<link rel="stylesheet" href="/estilo.css?v=20261127">
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
// base.css e estilo.css são mantidos à mão no site (padrão visual, 27/11/2026); o gerador só escreve as páginas.
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
