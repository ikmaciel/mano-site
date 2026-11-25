// Organograma do clube (decisão 504 do app, 25/11/2026). O mesmo dado que o clube vê e ajusta no app:
// cada cargo fica abaixo de outro e a posição é o nível de quem cria e dá cargo (regras no servidor).
// Aqui a superadministração monta arrastando, com mouse ou dedo (segure a caixa um instante): no meio de outra
// caixa = fica abaixo dela; na borda esquerda ou direita = fica antes ou depois, no mesmo nível.
// Três partes, como nos modelos do proprietário: cargos em árvore, território (Nacional > Regionais > Seções)
// e etapas de ingresso.
window.painelOrganograma = function (ajuda) {
  var esc = ajuda.esc, num = ajuda.num, rpc = ajuda.rpc, sb = ajuda.sb, $ = ajuda.$
  var ESCOPOS = { club: "Nacional", regional: "Em cada regional", subsection: "Em cada seção" }
  var mapa = null, clubId = null

  function mesmoTexto(a, b) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase() }
  function filhos(id) { return mapa.posts.filter(function (p) { return (p.parentId == null ? null : (existe(p.parentId) ? p.parentId : null)) === id }) }
  function existe(id) { return mapa.posts.some(function (p) { return p.id === id }) }
  function unidade(id) { return mapa.units.find(function (u) { return u.id === id }) }
  function abaixo(id) { var s = [id], mudou = true; while (mudou) { mudou = false; mapa.posts.forEach(function (p) { if (p.parentId != null && s.indexOf(p.parentId) >= 0 && s.indexOf(p.id) < 0) { s.push(p.id); mudou = true } }) } return s }

  function caixa(p) {
    var nome = mesmoTexto(p.name, p.abbreviation) ? "" : '<span class="org-nome">' + esc(p.name) + "</span>"
    var quem = p.isGroup ? "" : (p.holders.length ? p.holders.map(function (h) { var u = h.unitId ? unidade(h.unitId) : null; return esc(h.name) + (u ? ' <span class="fraco">(' + esc(u.name) + ")</span>" : "") }).join("<br>") : '<span class="fraco">ninguém</span>')
    var corpo = (p.description ? '<p class="org-desc">' + esc(p.description) + "</p>" : "") + (p.isGroup ? "" : '<p class="org-quem">' + quem + "</p>") + (p.scope !== "club" ? '<p class="org-escopo">' + esc(ESCOPOS[p.scope]) + "</p>" : "")
    return '<div class="org-caixa' + (p.isGroup ? " grupo" : "") + '" data-arrasta="cargo:' + p.id + '" data-cargo="' + p.id + '" style="--cor:' + esc(p.primary || "#7f2e24") + '">' +
      '<div class="org-topo"><b>' + esc(p.abbreviation) + "</b>" + nome + "</div>" + (corpo ? '<div class="org-corpo">' + corpo + "</div>" : "") +
      '<div class="org-acoes"><button class="link" data-novo="' + p.id + '">+ abaixo</button><button class="link" data-editar="' + p.id + '">Editar</button></div></div>'
  }
  function ramo(lista) {
    if (!lista.length) return ""
    return "<ul>" + lista.map(function (p) { return "<li>" + caixa(p) + ramo(filhos(p.id)) + "</li>" }).join("") + "</ul>"
  }
  function territorio() {
    function bloco(u) {
      var cargos = mapa.posts.filter(function (p) { return !p.isGroup }).map(function (p) { return { p: p, h: p.holders.filter(function (h) { return h.unitId === u.id }) } }).filter(function (c) { return c.h.length })
      var subs = mapa.units.filter(function (s) { return s.parentId === u.id })
      return '<li><div class="org-caixa unidade" data-arrasta="unidade:' + u.id + '" data-unidade="' + u.id + '"><div class="org-topo"><b>' + esc(u.name) + '</b><span class="org-nome">' + (u.level === "regional" ? "Regional" : "Seção") + (mesmoTexto(u.code, u.name) ? "" : " · " + esc(u.code)) + "</span></div>" +
        '<div class="org-corpo">' + (u.description ? '<p class="org-desc">' + esc(u.description) + "</p>" : "") +
        (cargos.length ? cargos.map(function (c) { return '<p class="org-quem"><b>' + esc(c.p.abbreviation) + "</b> " + c.h.map(function (h) { return esc(h.name) }).join(", ") + "</p>" }).join("") : '<p class="fraco">Sem cargo dado aqui</p>') +
        '<p class="org-escopo">' + num(u.homeMembers) + " com casa aqui</p></div>" +
        '<div class="org-acoes">' + (u.level === "regional" ? '<button class="link" data-nova-secao="' + u.id + '">+ seção</button>' : "") + '<button class="link" data-editar-unidade="' + u.id + '">Editar</button></div></div>' +
        (subs.length ? "<ul>" + subs.map(bloco).join("") + "</ul>" : "") + "</li>"
    }
    var regionais = mapa.units.filter(function (u) { return u.parentId == null })
    return '<ul><li><div class="org-caixa unidade nacional" data-unidade="nacional"><div class="org-topo"><b>' + esc(mapa.club.name) + '</b><span class="org-nome">Nacional · grupo inteiro</span></div><div class="org-corpo"><p class="org-quem">Presidente: ' + (mapa.presidents.map(esc).join(", ") || "—") + "<br>Administradores: " + (mapa.admins.map(esc).join(", ") || "—") + '</p><p class="org-escopo">' + num(mapa.members) + " integrantes · " + num(mapa.withoutUnit) + ' sem unidade de casa</p></div><div class="org-acoes"><button class="link" data-nova-regional="1">+ regional</button></div></div>' +
      (regionais.length ? "<ul>" + regionais.map(bloco).join("") + "</ul>" : "") + "</li></ul>"
  }
  function etapas() {
    var lista = mapa.stages.map(function (s) { return '<div class="etapa" data-arrasta="etapa:' + s.id + '" data-etapa="' + s.id + '"><b>' + esc(s.name) + '</b><span class="fraco">' + num(s.members) + ' pessoa(s)</span><button class="link" data-remover-etapa="' + s.id + '" aria-label="Remover a etapa ' + esc(s.name) + '">Remover</button></div>' }).join('<span class="seta" aria-hidden="true">→</span>')
    return '<div class="etapas">' + (lista || '<p class="fraco">Sem etapas. Ex.: Interessado → Aspirante → Membro efetivo.</p>') + '</div><form id="form-etapa" class="linha"><input id="nome-etapa" maxlength="40" placeholder="Nova etapa (vai para o fim)"><button class="botao claro">Adicionar etapa</button></form>'
  }

  function desenhar() {
    var topo = filhos(null)
    $("organograma").innerHTML =
      '<h3>Cargos</h3><p class="fraco">Arraste as caixas (no celular, segure um instante antes de arrastar). Solte no meio de outra caixa para pôr abaixo dela; na borda esquerda ou direita para pôr antes ou depois, no mesmo nível; em "Topo" para subir ao topo. Caixa tracejada é grupo (ex.: Diretoria), que não se dá a ninguém.</p>' +
      '<div class="org-zona-topo" data-topo="1">Topo · <button class="link" data-novo="topo">+ cargo no topo</button></div>' +
      '<div class="org rolagem">' + (topo.length ? ramo(topo) : '<p class="fraco">Nenhum cargo ainda.</p>') + "</div>" +
      '<h3>Território</h3><p class="fraco">Arraste uma seção para outra regional; uma regional sem seções para dentro de outra (vira seção); uma seção para o grupo (vira regional).</p><div class="org rolagem">' + territorio() + "</div>" +
      "<h3>Etapas de ingresso</h3><p class=\"fraco\">Arraste uma etapa para a esquerda ou a direita de outra para mudar a ordem.</p>" + etapas()
    $("form-etapa").onsubmit = async function (ev) {
      ev.preventDefault()
      var nome = $("nome-etapa").value.trim(); if (nome.length < 2) return
      var ordem = Math.min(999, (mapa.stages.length ? mapa.stages[mapa.stages.length - 1].sortOrder : 0) + 10)
      await gravar(sb.from("motoclube_estagios").insert({ club_id: clubId, name: nome, sort_order: ordem }))
    }
  }

  async function gravar(promessa) {
    var r = await promessa
    if (r.error) { alert(r.error.message); return false }
    await recarregar(); return true
  }
  async function recarregar() { mapa = await rpc("admin_web_power_map", { p_club_id: clubId }); desenhar() }

  // Janela do cargo: nome, sigla, o que faz, fica abaixo de, onde vale, grupo e cor.
  function editarCargo(p, paiInicial) {
    var novo = !p
    p = p || { name: "", abbreviation: "", description: "", scope: "club", parentId: paiInicial, isGroup: false, primary: "#7f2e24" }
    var bloqueados = novo ? [] : abaixo(p.id)
    var pais = '<option value="">Topo</option>' + mapa.posts.filter(function (x) { return bloqueados.indexOf(x.id) < 0 }).map(function (x) { return '<option value="' + x.id + '"' + (x.id === p.parentId ? " selected" : "") + ">" + esc(x.abbreviation + (mesmoTexto(x.name, x.abbreviation) ? "" : " — " + x.name)) + "</option>" }).join("")
    var escopos = Object.keys(ESCOPOS).map(function (k) { return '<option value="' + k + '"' + (p.scope === k ? " selected" : "") + ">" + ESCOPOS[k] + "</option>" }).join("")
    $("cargo-titulo").textContent = novo ? "Novo cargo" : "Cargo " + p.abbreviation
    $("cargo-corpo").innerHTML = '<label>Nome<input id="c-nome" maxlength="80" value="' + esc(p.name) + '" placeholder="Ex.: Diretor de estrada" required></label>' +
      '<label>Sigla no colete<input id="c-sigla" maxlength="20" value="' + esc(p.abbreviation) + '" placeholder="Até 20 letras" required></label>' +
      '<label>O que faz<input id="c-desc" maxlength="120" value="' + esc(p.description || "") + '" placeholder="Ex.: Passeios e rotas"></label>' +
      '<label>Fica abaixo de<select id="c-pai">' + pais + "</select></label>" +
      '<label>Onde vale<select id="c-escopo">' + escopos + "</select></label>" +
      '<label class="linha"><input type="checkbox" id="c-grupo"' + (p.isGroup ? " checked" : "") + ' style="width:auto"> É um grupo (ex.: Diretoria), não se dá a ninguém</label>' +
      '<label>Cor do patch<input type="color" id="c-cor" value="' + esc(p.primary || "#7f2e24") + '"></label>'
    $("cargo-remover").hidden = novo
    $("cargo-erro").textContent = ""
    $("cargo-salvar").onclick = async function (ev) {
      ev.preventDefault()
      var dados = { name: $("c-nome").value.trim(), abbreviation: $("c-sigla").value.trim().toUpperCase(), description: $("c-desc").value.trim() || null, parent_patch_id: $("c-pai").value ? Number($("c-pai").value) : null, scope_type: $("c-escopo").value, is_group: $("c-grupo").checked, primary_color: $("c-cor").value }
      if (dados.name.length < 2 || !dados.abbreviation) { $("cargo-erro").textContent = "Informe o nome e a sigla."; return }
      var r = novo ? await sb.from("motoclube_hierarquia_patches").insert(Object.assign({ club_id: clubId }, dados)) : await sb.from("motoclube_hierarquia_patches").update(Object.assign({ updated_at: new Date().toISOString() }, dados)).eq("id", p.id)
      if (r.error) { $("cargo-erro").textContent = r.error.message; return }
      $("janela-cargo").close(); await recarregar()
    }
    $("cargo-remover").onclick = async function (ev) {
      ev.preventDefault()
      var pessoas = p.holders ? p.holders.length : 0
      if (!confirm("Remover " + p.abbreviation + "?" + (pessoas ? " " + pessoas + " pessoa(s) perdem o cargo." : "") + " Quem fica abaixo sobe um nível.")) return
      var r = await sb.from("motoclube_hierarquia_patches").update({ active: false, updated_at: new Date().toISOString() }).eq("id", p.id)
      if (r.error) { $("cargo-erro").textContent = r.error.message; return }
      $("janela-cargo").close(); await recarregar()
    }
    $("janela-cargo").showModal()
  }
  async function editarUnidade(u, paiRegional) {
    var nome = prompt(u ? "Nome da unidade" : (paiRegional ? "Nome da seção" : "Nome da regional"), u ? u.name : "")
    if (!nome || nome.trim().length < 2) return
    var sigla = prompt("Sigla (até 12 letras)", u ? u.code : nome.trim().slice(0, 12).toUpperCase())
    if (!sigla) return
    var dados = { name: nome.trim(), code: sigla.trim().slice(0, 12).toUpperCase(), updated_at: new Date().toISOString() }
    if (u) await gravar(sb.from("motoclube_regioes").update(dados).eq("id", u.id))
    else await gravar(sb.from("motoclube_regioes").insert(Object.assign({ club_id: clubId, level: paiRegional ? "subsection" : "regional", parent_region_id: paiRegional || null, active: true }, dados)))
  }

  var area = $("organograma")
  area.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b || !mapa) return
    var achar = function (id) { return mapa.posts.find(function (p) { return p.id === Number(id) }) }
    if (b.dataset.novo) editarCargo(null, b.dataset.novo === "topo" ? null : Number(b.dataset.novo))
    else if (b.dataset.editar) editarCargo(achar(b.dataset.editar))
    else if (b.dataset.novaRegional) editarUnidade(null, null)
    else if (b.dataset.novaSecao) editarUnidade(null, Number(b.dataset.novaSecao))
    else if (b.dataset.editarUnidade) editarUnidade(unidade(Number(b.dataset.editarUnidade)), null)
    else if (b.dataset.removerEtapa && confirm("Remover esta etapa? Quem está nela fica sem etapa.")) gravar(sb.from("motoclube_estagios").update({ active: false }).eq("id", Number(b.dataset.removerEtapa)))
  })
  // ---- Arrastar com mouse ou dedo (decisão 504). Toque curto continua rolando a tela; segurar 350 ms começa a arrastar.
  var arraste = null, ignorarClique = false
  function fimArraste() {
    if (arraste && arraste.quadro) cancelAnimationFrame(arraste.quadro)
    if (arraste && arraste.fantasma) arraste.fantasma.remove()
    area.querySelectorAll(".arrastando,.alvo,.alvo-antes,.alvo-depois").forEach(function (n) { n.classList.remove("arrastando", "alvo", "alvo-antes", "alvo-depois") })
    arraste = null
  }
  function comecar(x, y) {
    arraste.ativo = true
    arraste.origem.classList.add("arrastando")
    var f = arraste.origem.cloneNode(true)
    f.className += " org-fantasma"
    f.style.width = arraste.origem.offsetWidth + "px"
    document.body.appendChild(f)
    arraste.fantasma = f
    mover(x, y)
    arraste.quadro = requestAnimationFrame(rolarSozinho)
  }
  // Onde a caixa vai cair: dentro (abaixo), antes ou depois de outra, no topo ou numa unidade.
  function alvoEm(x, y) {
    var el = document.elementFromPoint(x, y)
    if (!el) return null
    var tipo = arraste.tipo
    if (tipo === "cargo") {
      if (el.closest("[data-topo]")) return { modo: "topo", el: el.closest("[data-topo]") }
      var c = el.closest("[data-cargo]"); if (!c) return null
      var id = Number(c.dataset.cargo); if (abaixo(arraste.id).indexOf(id) >= 0) return null
      var r = c.getBoundingClientRect(), fra = (x - r.left) / r.width
      return { modo: fra < 0.25 ? "antes" : fra > 0.75 ? "depois" : "dentro", el: c, id: id }
    }
    if (tipo === "etapa") {
      var e = el.closest("[data-etapa]"); if (!e || Number(e.dataset.etapa) === arraste.id) return null
      var re = e.getBoundingClientRect()
      return { modo: x < re.left + re.width / 2 ? "antes" : "depois", el: e, id: Number(e.dataset.etapa) }
    }
    var u = el.closest("[data-unidade]"); if (!u || u.dataset.unidade === String(arraste.id)) return null
    return { modo: "dentro", el: u, id: u.dataset.unidade === "nacional" ? null : Number(u.dataset.unidade) }
  }
  // Rolagem automática: perto da borda da janela (ou dos lados de uma árvore larga) a tela anda sozinha,
  // para alcançar caixas que estão fora da vista enquanto arrasta.
  function rolarSozinho() {
    if (!arraste || !arraste.ativo) return
    var x = arraste.px, y = arraste.py, passo = 0
    if (y < 110) passo = -14; else if (y > innerHeight - 70) passo = 14
    if (passo) window.scrollBy(0, passo)
    var trilho = arraste.origem.closest(".rolagem")
    if (trilho) { var r = trilho.getBoundingClientRect(); if (x < r.left + 50) trilho.scrollLeft -= 14; else if (x > r.right - 50) trilho.scrollLeft += 14 }
    if (passo || trilho) mover(x, y, true)
    arraste.quadro = requestAnimationFrame(rolarSozinho)
  }
  function mover(x, y, daRolagem) {
    if (!daRolagem) { arraste.px = x; arraste.py = y }
    arraste.fantasma.style.left = (x + 8) + "px"; arraste.fantasma.style.top = (y + 8) + "px"
    area.querySelectorAll(".alvo,.alvo-antes,.alvo-depois").forEach(function (n) { n.classList.remove("alvo", "alvo-antes", "alvo-depois") })
    arraste.alvo = alvoEm(x, y)
    if (arraste.alvo) arraste.alvo.el.classList.add(arraste.alvo.modo === "antes" ? "alvo-antes" : arraste.alvo.modo === "depois" ? "alvo-depois" : "alvo")
  }
  async function soltar() {
    var a = arraste.alvo, tipo = arraste.tipo, id = arraste.id
    fimArraste()
    if (!a) return
    try {
      if (tipo === "cargo") await soltarCargo(id, a)
      else if (tipo === "etapa") await soltarEtapa(id, a)
      else await soltarUnidade(id, a)
    } catch (e) { alert(e.message || e) }
    await recarregar()
  }
  function falhou(r) { if (r.error) throw new Error(r.error.message) }
  async function reordenar(tabela, ids) {
    var feitos = await Promise.all(ids.map(function (id, i) { return sb.from(tabela).update({ sort_order: (i + 1) * 10 }).eq("id", id) }))
    feitos.forEach(falhou)
  }
  async function soltarCargo(id, a) {
    var agora = new Date().toISOString()
    if (a.modo === "topo" || a.modo === "dentro") {
      falhou(await sb.from("motoclube_hierarquia_patches").update({ parent_patch_id: a.modo === "topo" ? null : a.id, updated_at: agora }).eq("id", id))
      return
    }
    // Antes ou depois: fica com o mesmo cargo de cima do alvo, na posição escolhida entre os irmãos.
    var alvo = mapa.posts.find(function (p) { return p.id === a.id })
    var pai = alvo.parentId != null && existe(alvo.parentId) ? alvo.parentId : null
    var irmaos = filhos(pai).map(function (p) { return p.id }).filter(function (x) { return x !== id })
    irmaos.splice(irmaos.indexOf(a.id) + (a.modo === "depois" ? 1 : 0), 0, id)
    var atual = mapa.posts.find(function (p) { return p.id === id })
    if ((atual.parentId != null && existe(atual.parentId) ? atual.parentId : null) !== pai) falhou(await sb.from("motoclube_hierarquia_patches").update({ parent_patch_id: pai, updated_at: agora }).eq("id", id))
    await reordenar("motoclube_hierarquia_patches", irmaos)
  }
  async function soltarEtapa(id, a) {
    var ordem = mapa.stages.map(function (s) { return s.id }).filter(function (x) { return x !== id })
    ordem.splice(ordem.indexOf(a.id) + (a.modo === "depois" ? 1 : 0), 0, id)
    await reordenar("motoclube_estagios", ordem)
  }
  // Território: seção vai para outra regional; regional sem seções vira seção de outra; seção solta no grupo vira regional.
  async function soltarUnidade(id, a) {
    var u = unidade(id), agora = new Date().toISOString()
    if (a.id === null) {
      if (u.level === "regional") return
      falhou(await sb.from("motoclube_regioes").update({ level: "regional", parent_region_id: null, updated_at: agora }).eq("id", id))
      return
    }
    var destino = unidade(a.id)
    if (destino.level !== "regional") throw new Error("Solte numa regional (a seção não tem seções dentro).")
    if (u.level === "regional" && mapa.units.some(function (s) { return s.parentId === id })) throw new Error("Esta regional tem seções. Mova as seções dela antes de transformá-la em seção.")
    if (u.parentId === a.id) return
    falhou(await sb.from("motoclube_regioes").update({ level: "subsection", parent_region_id: a.id, updated_at: agora }).eq("id", id))
  }
  function inicio(ev, x, y, toque) {
    if (ev.target.closest("button,a,input")) return
    var el = ev.target.closest("[data-arrasta]"); if (!el || arraste) return
    var partes = el.dataset.arrasta.split(":")
    arraste = { tipo: partes[0], id: Number(partes[1]), origem: el, x: x, y: y, ativo: false, toque: toque }
    if (toque) arraste.espera = setTimeout(function () { if (arraste && !arraste.ativo) comecar(arraste.x, arraste.y) }, 350)
  }
  function movimento(ev, x, y) {
    if (!arraste) return
    if (!arraste.ativo) {
      var longe = Math.abs(x - arraste.x) + Math.abs(y - arraste.y) > 8
      if (arraste.toque) { if (longe) { clearTimeout(arraste.espera); arraste = null } return }
      if (longe) comecar(x, y); else return
    }
    ev.preventDefault()
    mover(x, y)
  }
  function termino() {
    if (!arraste) return
    clearTimeout(arraste.espera)
    if (arraste.ativo) { ignorarClique = true; setTimeout(function () { ignorarClique = false }, 0); soltar() } else arraste = null
  }
  area.addEventListener("mousedown", function (ev) { if (ev.button === 0) inicio(ev, ev.clientX, ev.clientY, false) })
  document.addEventListener("mousemove", function (ev) { movimento(ev, ev.clientX, ev.clientY) })
  document.addEventListener("mouseup", termino)
  area.addEventListener("touchstart", function (ev) { var t = ev.touches[0]; inicio(ev, t.clientX, t.clientY, true) }, { passive: true })
  document.addEventListener("touchmove", function (ev) { var t = ev.touches[0]; if (t) movimento(ev, t.clientX, t.clientY) }, { passive: false })
  document.addEventListener("touchend", termino)
  document.addEventListener("touchcancel", function () { if (arraste) { clearTimeout(arraste.espera); fimArraste() } })
  area.addEventListener("click", function (ev) { if (ignorarClique) { ev.stopPropagation(); ev.preventDefault() } }, true)
  // Segurar no celular abre o menu do navegador; dentro do organograma, o segurar é para arrastar.
  area.addEventListener("contextmenu", function (ev) { if (ev.target.closest("[data-arrasta]")) ev.preventDefault() })

  return {
    abrir: async function (id) {
      clubId = Number(id)
      area.innerHTML = '<p class="fraco">Carregando…</p>'
      try { await recarregar() } catch (e) { area.innerHTML = '<p class="erro">' + esc(e.message || e) + "</p>" }
    },
  }
}
