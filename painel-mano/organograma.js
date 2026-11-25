// Organograma do clube (decisão 504 do app, 25/11/2026). O mesmo dado que o clube vê e ajusta no app:
// cada cargo fica abaixo de outro e a posição é o nível de quem cria e dá cargo (regras no servidor).
// Aqui a superadministração monta arrastando: solte uma caixa sobre outra para pôr abaixo dela.
// Três partes, como nos modelos do proprietário: cargos em árvore, território (Nacional > Regionais > Seções)
// e etapas de ingresso.
window.painelOrganograma = function (ajuda) {
  var esc = ajuda.esc, num = ajuda.num, rpc = ajuda.rpc, sb = ajuda.sb, $ = ajuda.$
  var ESCOPOS = { club: "Nacional", regional: "Em cada regional", subsection: "Em cada seção" }
  var mapa = null, clubId = null, arrastando = null

  function mesmoTexto(a, b) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase() }
  function filhos(id) { return mapa.posts.filter(function (p) { return (p.parentId == null ? null : (existe(p.parentId) ? p.parentId : null)) === id }) }
  function existe(id) { return mapa.posts.some(function (p) { return p.id === id }) }
  function unidade(id) { return mapa.units.find(function (u) { return u.id === id }) }
  function abaixo(id) { var s = [id], mudou = true; while (mudou) { mudou = false; mapa.posts.forEach(function (p) { if (p.parentId != null && s.indexOf(p.parentId) >= 0 && s.indexOf(p.id) < 0) { s.push(p.id); mudou = true } }) } return s }

  function caixa(p) {
    var nome = mesmoTexto(p.name, p.abbreviation) ? "" : '<span class="org-nome">' + esc(p.name) + "</span>"
    var quem = p.isGroup ? "" : (p.holders.length ? p.holders.map(function (h) { var u = h.unitId ? unidade(h.unitId) : null; return esc(h.name) + (u ? ' <span class="fraco">(' + esc(u.name) + ")</span>" : "") }).join("<br>") : '<span class="fraco">ninguém</span>')
    var corpo = (p.description ? '<p class="org-desc">' + esc(p.description) + "</p>" : "") + (p.isGroup ? "" : '<p class="org-quem">' + quem + "</p>") + (p.scope !== "club" ? '<p class="org-escopo">' + esc(ESCOPOS[p.scope]) + "</p>" : "")
    return '<div class="org-caixa' + (p.isGroup ? " grupo" : "") + '" draggable="true" data-cargo="' + p.id + '" style="--cor:' + esc(p.primary || "#7f2e24") + '">' +
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
      return '<li><div class="org-caixa unidade" data-unidade="' + u.id + '"><div class="org-topo"><b>' + esc(u.name) + '</b><span class="org-nome">' + (u.level === "regional" ? "Regional" : "Seção") + (mesmoTexto(u.code, u.name) ? "" : " · " + esc(u.code)) + "</span></div>" +
        '<div class="org-corpo">' + (u.description ? '<p class="org-desc">' + esc(u.description) + "</p>" : "") +
        (cargos.length ? cargos.map(function (c) { return '<p class="org-quem"><b>' + esc(c.p.abbreviation) + "</b> " + c.h.map(function (h) { return esc(h.name) }).join(", ") + "</p>" }).join("") : '<p class="fraco">Sem cargo dado aqui</p>') +
        '<p class="org-escopo">' + num(u.homeMembers) + " com casa aqui</p></div>" +
        '<div class="org-acoes">' + (u.level === "regional" ? '<button class="link" data-nova-secao="' + u.id + '">+ seção</button>' : "") + '<button class="link" data-editar-unidade="' + u.id + '">Editar</button></div></div>' +
        (subs.length ? "<ul>" + subs.map(bloco).join("") + "</ul>" : "") + "</li>"
    }
    var regionais = mapa.units.filter(function (u) { return u.parentId == null })
    return '<ul><li><div class="org-caixa unidade nacional"><div class="org-topo"><b>' + esc(mapa.club.name) + '</b><span class="org-nome">Nacional · grupo inteiro</span></div><div class="org-corpo"><p class="org-quem">Presidente: ' + (mapa.presidents.map(esc).join(", ") || "—") + "<br>Administradores: " + (mapa.admins.map(esc).join(", ") || "—") + '</p><p class="org-escopo">' + num(mapa.members) + " integrantes · " + num(mapa.withoutUnit) + ' sem unidade de casa</p></div><div class="org-acoes"><button class="link" data-nova-regional="1">+ regional</button></div></div>' +
      (regionais.length ? "<ul>" + regionais.map(bloco).join("") + "</ul>" : "") + "</li></ul>"
  }
  function etapas() {
    var lista = mapa.stages.map(function (s) { return '<div class="etapa"><b>' + esc(s.name) + '</b><span class="fraco">' + num(s.members) + ' pessoa(s)</span><button class="link" data-remover-etapa="' + s.id + '" aria-label="Remover a etapa ' + esc(s.name) + '">Remover</button></div>' }).join('<span class="seta" aria-hidden="true">→</span>')
    return '<div class="etapas">' + (lista || '<p class="fraco">Sem etapas. Ex.: Interessado → Aspirante → Membro efetivo.</p>') + '</div><form id="form-etapa" class="linha"><input id="nome-etapa" maxlength="40" placeholder="Nova etapa (vai para o fim)"><button class="botao claro">Adicionar etapa</button></form>'
  }

  function desenhar() {
    var topo = filhos(null)
    $("organograma").innerHTML =
      '<h3>Cargos</h3><p class="fraco">Solte uma caixa sobre outra para pôr abaixo dela; solte em "Topo" para subir ao topo. Caixa tracejada é grupo (ex.: Diretoria), que não se dá a ninguém.</p>' +
      '<div class="org-zona-topo" data-topo="1">Topo · <button class="link" data-novo="topo">+ cargo no topo</button></div>' +
      '<div class="org rolagem">' + (topo.length ? ramo(topo) : '<p class="fraco">Nenhum cargo ainda.</p>') + "</div>" +
      '<h3>Território</h3><div class="org rolagem">' + territorio() + "</div>" +
      "<h3>Etapas de ingresso</h3>" + etapas()
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
  area.addEventListener("dragstart", function (ev) { var c = ev.target.closest("[data-cargo]"); if (!c) return; arrastando = Number(c.dataset.cargo); ev.dataTransfer.effectAllowed = "move"; c.classList.add("arrastando") })
  area.addEventListener("dragend", function () { arrastando = null; area.querySelectorAll(".arrastando,.alvo").forEach(function (n) { n.classList.remove("arrastando", "alvo") }) })
  area.addEventListener("dragover", function (ev) {
    var alvo = ev.target.closest("[data-cargo],[data-topo]"); if (!alvo || arrastando == null) return
    if (alvo.dataset.cargo && abaixo(arrastando).indexOf(Number(alvo.dataset.cargo)) >= 0) return
    ev.preventDefault(); area.querySelectorAll(".alvo").forEach(function (n) { n.classList.remove("alvo") }); alvo.classList.add("alvo")
  })
  area.addEventListener("drop", function (ev) {
    var alvo = ev.target.closest("[data-cargo],[data-topo]"); if (!alvo || arrastando == null) return
    ev.preventDefault()
    var pai = alvo.dataset.topo ? null : Number(alvo.dataset.cargo), id = arrastando
    arrastando = null
    gravar(sb.from("motoclube_hierarquia_patches").update({ parent_patch_id: pai, updated_at: new Date().toISOString() }).eq("id", id))
  })

  return {
    abrir: async function (id) {
      clubId = Number(id)
      area.innerHTML = '<p class="fraco">Carregando…</p>'
      try { await recarregar() } catch (e) { area.innerHTML = '<p class="erro">' + esc(e.message || e) + "</p>" }
    },
  }
}
