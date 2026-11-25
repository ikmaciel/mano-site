// Aba Poderes (decisão 502 do app, 25/11/2026): quem vê e quem controla o quê dentro de um grupo, e a árvore
// Grupo > Regionais > Subseções com acessos e cargos, desenhados como aparecem no colete.
// A grade vem do servidor (admin_web_power_rules); as linhas "conferida por teste" são provadas pelo e2e
// mapa-de-poderes-502 contra as funções reais.
window.painelPoderes = function (ajuda) {
  var esc = ajuda.esc, num = ajuda.num, rpc = ajuda.rpc, $ = ajuda.$
  var NIVEIS = [["integrante", "Integrante"], ["admin", "Administrador"], ["presidente", "Presidente"], ["plataforma", "Plataforma MANO"]]

  function grade(regras) {
    var areas = []
    regras.forEach(function (r) { if (areas.indexOf(r.area) < 0) areas.push(r.area) })
    var cab = "<tr><th>O que</th>" + NIVEIS.map(function (n) { return '<th scope="col">' + n[1] + "</th>" }).join("") + "</tr>"
    var corpo = areas.map(function (area) {
      return '<tr class="area"><th colspan="5" scope="rowgroup">' + esc(area) + "</th></tr>" + regras.filter(function (r) { return r.area === area }).map(function (r) {
        return '<tr><th scope="row">' + esc(r.acao) + '<small>' + esc(r.regra) + (r.teste ? ' · <span class="selo ok">conferida por teste</span>' : "") + "</small></th>" +
          NIVEIS.map(function (n) { return r[n[0]] ? '<td class="sim" aria-label="pode">✓</td>' : '<td class="nao" aria-label="não pode">—</td>' }).join("") + "</tr>"
      }).join("")
    }).join("")
    return '<table class="grade-poderes"><thead>' + cab + "</thead><tbody>" + corpo + "</tbody></table>"
  }

  // O cargo como no colete: sigla na cor do patch, com a moldura da mesma cor.
  function patch(p) { return '<span class="patch" style="--cor:' + esc(p.primary) + '">' + esc(p.abbreviation) + "</span>" }
  function cargos(lista) {
    if (!lista.length) return ""
    return '<div class="cargos">' + lista.map(function (c) {
      var nomes = c.pessoas.length ? c.pessoas.map(esc).join(", ") : '<span class="fraco">ninguém</span>'
      var nome = c.post.name.trim().toLowerCase() === c.post.abbreviation.trim().toLowerCase() ? "" : '<span class="fraco">' + esc(c.post.name) + "</span> "
      return '<div class="cargo">' + patch(c.post) + "<div>" + nome + nomes + "</div></div>"
    }).join("") + "</div>"
  }
  function caixaUnidade(u, mapa, filhos) {
    var regionais = mapa.posts.filter(function (p) { return p.scope === "regional" }).map(function (p) {
      return { post: p, pessoas: p.holders.filter(function (h) { return h.unitId === u.id }).map(function (h) { return h.name }) }
    }).filter(function (c) { return c.pessoas.length })
    return '<div class="unidade ' + (u.level === "regional" ? "regional" : "subsecao") + '"><div class="cabeca"><b>' + esc(u.name) + '</b><span class="fraco">' + (u.code.trim().toLowerCase() === u.name.trim().toLowerCase() ? "" : esc(u.code) + " · ") + (u.level === "regional" ? "Regional" : "Subseção") + " · " + num(u.homeMembers) + " com casa aqui</span></div>" +
      cargos(regionais) + (filhos.length ? '<div class="filhos">' + filhos.join("") + "</div>" : "") + "</div>"
  }
  function arvore(m) {
    var nacionais = m.posts.filter(function (p) { return p.scope === "club" }).map(function (p) { return { post: p, pessoas: p.holders.map(function (h) { return h.name }) } })
    var regionaisSemDono = m.posts.filter(function (p) { return p.scope === "regional" && !p.holders.length })
    var topo = m.units.filter(function (u) { return u.parentId == null })
    var unidades = topo.map(function (u) {
      var subs = m.units.filter(function (s) { return s.parentId === u.id }).map(function (s) { return caixaUnidade(s, m, []) })
      return caixaUnidade(u, m, subs)
    })
    var acessos = '<div class="acessos"><div><span class="fraco">Presidente</span><b>' + (m.presidents.map(esc).join(", ") || "—") + '</b></div><div><span class="fraco">Administradores</span><b>' + (m.admins.map(esc).join(", ") || "—") + '</b></div><div><span class="fraco">Integrantes</span><b>' + num(m.members) + "</b></div></div>"
    return '<div class="unidade grupo"><div class="cabeca"><b>' + esc(m.club.name) + '</b><span class="fraco">' + esc(m.club.groupType) + " · grupo inteiro · " + num(m.withoutUnit) + " sem unidade de casa</span></div>" +
      acessos + cargos(nacionais) +
      (unidades.length ? '<div class="filhos">' + unidades.join("") + "</div>" : '<p class="fraco">Sem regionais cadastradas.</p>') +
      (regionaisSemDono.length ? '<p class="fraco">Cargos regionais sem ninguém: ' + regionaisSemDono.map(patch).join(" ") + "</p>" : "") + "</div>"
  }

  async function carregarGrade() {
    try { $("grade-poderes").innerHTML = grade(await rpc("admin_web_power_rules")) }
    catch (e) { $("grade-poderes").innerHTML = '<p class="erro">' + esc(e.message || e) + "</p>" }
  }
  async function buscar() {
    try {
      var r = await rpc("mobile_platform_admin_page", { target_section: "groups", target_query: $("busca-poderes").value, target_filter: "all", target_page: 1, target_page_size: 20 })
      $("grupos-poderes").innerHTML = r.items.map(function (g) { return '<button class="botao claro" data-grupo="' + g.id + '">' + esc(g.name) + "</button>" }).join(" ") || '<p class="fraco">Nenhum grupo.</p>'
    } catch (e) { $("grupos-poderes").innerHTML = '<p class="erro">' + esc(e.message || e) + "</p>" }
  }
  async function abrirGrupo(id) {
    $("arvore-poderes").innerHTML = '<p class="fraco">Carregando…</p>'
    try { $("arvore-poderes").innerHTML = arvore(await rpc("admin_web_power_map", { p_club_id: Number(id) })) }
    catch (e) { $("arvore-poderes").innerHTML = '<p class="erro">' + esc(e.message || e) + "</p>" }
  }

  var temporizador
  $("busca-poderes").oninput = function () { clearTimeout(temporizador); temporizador = setTimeout(buscar, 300) }
  $("grupos-poderes").onclick = function (ev) { var b = ev.target.closest("[data-grupo]"); if (b) abrirGrupo(b.dataset.grupo) }
  return { abrir: function () { carregarGrade(); buscar() } }
}
