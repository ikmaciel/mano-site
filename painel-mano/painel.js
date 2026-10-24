// Painel de superadministração do MANO (decisões do proprietário, 23/10/2026).
// Tudo o que aparece aqui vem de funções do servidor que conferem platform_admins a cada chamada; a página em si
// não guarda segredo nenhum (só a chave pública do projeto, a mesma do app e das páginas de acompanhamento).
(function () {
  var ambientes = {
    producao: { nome: "Produção", url: "https://mpycjhboiaoocjmtkeoh.supabase.co", chave: "sb_publishable_4CGXNwTULxigv1PVoLiXUA_xUXUQssk" },
    testes: { nome: "Testes (HML)", url: "https://ixgrttjjzfuxkohuyatj.supabase.co", chave: "sb_publishable_I-GtG0bDrzkUknW6ISF2FA_vO3MbXMV" },
  }
  var amb = new URLSearchParams(location.search).get("ambiente") === "testes" ? ambientes.testes : ambientes.producao
  var sb = window.supabase.createClient(amb.url, amb.chave, { auth: { persistSession: true, storageKey: "mano-painel-" + (amb === ambientes.testes ? "hml" : "prod") } })
  var $ = function (id) { return document.getElementById(id) }
  var carregadas = {}
  var mapa = null
  var paginaUsuarios = 1

  $("ambiente").textContent = amb.nome

  function esc(texto) { return String(texto == null ? "" : texto).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }
  function data(valor, comHora) { if (!valor) return "—"; var d = new Date(valor); return comHora ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : d.toLocaleDateString("pt-BR") }
  function num(valor) { return Number(valor || 0).toLocaleString("pt-BR") }
  function mostrar(id, sim) { $(id).hidden = !sim }
  async function rpc(nome, args) {
    var r = await sb.rpc(nome, args || {})
    if (r.error) throw new Error(r.error.message || "O servidor recusou a operação.")
    return r.data
  }
  function falha(alvo, erro) { $(alvo).innerHTML = '<p class="erro">' + esc(erro.message || erro) + "</p>" }

  // Janela única para editar com motivo (a auditoria exige motivo em toda mudança).
  function janela(titulo, corpo, aoSalvar) {
    $("janela-titulo").textContent = titulo
    $("janela-corpo").innerHTML = corpo
    $("janela-motivo").value = ""
    $("janela-erro").textContent = ""
    var d = $("janela")
    d.showModal()
    $("janela-ok").onclick = async function (ev) {
      ev.preventDefault()
      var motivo = $("janela-motivo").value.trim()
      if (motivo.length < 3) { $("janela-erro").textContent = "Escreva o motivo (fica na auditoria)."; return }
      $("janela-ok").disabled = true
      try { await aoSalvar(motivo); d.close() } catch (e) { $("janela-erro").textContent = e.message } finally { $("janela-ok").disabled = false }
    }
  }

  // ---------- Entrada ----------
  $("google").onclick = function () { sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname + location.search } }) }
  $("form-senha").onsubmit = async function (ev) {
    ev.preventDefault()
    $("erro-entrar").textContent = ""
    var r = await sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("senha").value })
    if (r.error) $("erro-entrar").textContent = "Não foi possível entrar: confira e-mail e senha."
  }
  $("sair").onclick = async function () { await sb.auth.signOut(); location.reload() }

  async function iniciar() {
    var s = (await sb.auth.getSession()).data.session
    mostrar("sair", Boolean(s))
    if (!s) { mostrar("entrar", true); mostrar("painel", false); mostrar("sem-acesso", false); return }
    mostrar("entrar", false)
    $("quem").textContent = s.user.email || ""
    try {
      await rpc("admin_web_adoption", { p_days: 7 })
    } catch (e) {
      mostrar("sem-acesso", true); mostrar("painel", false); return
    }
    mostrar("sem-acesso", false)
    mostrar("painel", true)
    abrir("adesao")
  }
  sb.auth.onAuthStateChange(function (evento) { if (evento === "SIGNED_IN" || evento === "SIGNED_OUT") iniciar() })

  // ---------- Abas ----------
  document.querySelectorAll(".abas button").forEach(function (b) { b.onclick = function () { abrir(b.dataset.aba) } })
  function abrir(aba) {
    document.querySelectorAll(".abas button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.aba === aba)) })
    document.querySelectorAll("[data-painel]").forEach(function (s) { s.hidden = s.dataset.painel !== aba })
    if (carregadas[aba]) { if (aba === "adesao" && mapa) mapa.resize(); return }
    carregadas[aba] = true
    if (aba === "adesao") carregarAdesao()
    if (aba === "grupos") { carregarGrupos(); carregarPedidos() }
    if (aba === "usuarios") { carregarUsuarios(true); carregarAdmins() }
    if (aba === "denuncias") { carregarDenuncias(); carregarEventos() }
  }

  // ---------- Adesão ----------
  async function carregarAdesao() {
    try {
      var d = await rpc("admin_web_adoption", { p_days: 60 })
      var t = d.totals
      var cartoes = [
        [t.accounts, "contas no total"], [t.accounts7, "novas em 7 dias"], [t.accounts30, "novas em 30 dias"],
        [t.riders7, "viajaram em 7 dias"], [t.riders30, "viajaram em 30 dias"], [t.trips30, "viagens em 30 dias"],
        [t.km30, "km rodados em 30 dias"], [t.convoys30, "comboios em 30 dias"], [t.groups, "grupos ativos"],
        [t.appRecent, "com app de 22/10 ou mais novo"], [t.tripsActiveNow, "viajando agora"],
      ]
      $("numeros").innerHTML = cartoes.map(function (c) { return '<div class="numero"><b>' + num(c[0]) + "</b><span>" + esc(c[1]) + "</span></div>" }).join("")
      var dias = {}
      d.signups.forEach(function (s) { dias[s.day] = s.accounts })
      var lista = []
      for (var i = d.days - 1; i >= 0; i--) { var dia = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); lista.push([dia, dias[dia] || 0]) }
      var max = Math.max(1, Math.max.apply(null, lista.map(function (x) { return x[1] })))
      $("cadastros").innerHTML = lista.map(function (x) { return '<div class="barra" title="' + esc(x[0].split("-").reverse().join("/") + ": " + x[1]) + '" style="height:' + Math.max(2, Math.round(x[1] / max * 130)) + 'px"></div>' }).join("")
      desenharMapa(d.regions)
    } catch (e) { falha("numeros", e) }
  }

  function desenharMapa(regioes) {
    var pontos = { type: "FeatureCollection", features: regioes.map(function (r) { return { type: "Feature", properties: { riders: r.riders }, geometry: { type: "Point", coordinates: [r.lon, r.lat] } } }) }
    mapa = new maplibregl.Map({ container: "mapa", style: "https://tiles.openfreemap.org/styles/liberty", center: [-47.9, -15.8], zoom: 3.4, attributionControl: { compact: true } })
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }))
    mapa.on("load", function () {
      mapa.addSource("regioes", { type: "geojson", data: pontos })
      mapa.addLayer({ id: "regioes", type: "circle", source: "regioes", paint: {
        "circle-color": "#a7181d", "circle-opacity": 0.55, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1,
        "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "riders"]], 1, 8, 10, 40],
      } })
      mapa.addLayer({ id: "regioes-numero", type: "symbol", source: "regioes", layout: { "text-field": ["to-string", ["get", "riders"]], "text-size": 12, "text-font": ["Noto Sans Regular"], "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } })
      if (regioes.length) {
        var b = new maplibregl.LngLatBounds()
        regioes.forEach(function (r) { b.extend([r.lon, r.lat]) })
        mapa.fitBounds(b, { padding: 60, maxZoom: 9, duration: 0 })
      }
    })
  }

  // ---------- Grupos ----------
  var temporizador
  $("busca-grupo").oninput = function () { clearTimeout(temporizador); temporizador = setTimeout(carregarGrupos, 300) }
  $("filtro-grupo").onchange = carregarGrupos
  var gruposPorId = {}
  async function carregarGrupos() {
    try {
      var r = await rpc("mobile_platform_admin_page", { target_section: "groups", target_query: $("busca-grupo").value, target_filter: $("filtro-grupo").value, target_page: 1, target_page_size: 50 })
      gruposPorId = {}
      $("lista-grupos").innerHTML = '<p class="fraco">' + num(r.total) + " grupo(s)</p>" + r.items.map(function (g) {
        gruposPorId[g.id] = g
        return '<div class="item">' + (g.logoUrl ? '<img class="brasao" alt="" src="' + esc(g.logoUrl) + '">' : '<span class="brasao"></span>') +
          '<div class="texto"><b>' + esc(g.name) + "</b>" + esc(g.groupType) + " · " + esc(g.city) + (g.chapterName ? " · " + esc(g.chapterName) : "") +
          '<br><span class="selo ' + (g.status === "approved" ? "ok" : "alerta") + '">' + esc(g.status === "approved" ? "ativo" : g.status) + "</span>" +
          '<span class="selo">' + esc(g.entryMode === "direct" ? "entrada direta" : "entrada com pedido") + "</span>" +
          '<div class="membros" id="membros-' + g.id + '"></div></div>' +
          '<div class="acoes"><button class="botao claro" data-editar="' + g.id + '">Editar</button><button class="botao claro" data-membros="' + g.id + '">Integrantes</button><button class="botao ' + (g.status === "approved" ? "perigo" : "") + '" data-pausar="' + g.id + '">' + (g.status === "approved" ? "Pausar" : "Reativar") + "</button></div></div>"
      }).join("")
    } catch (e) { falha("lista-grupos", e) }
  }
  $("lista-grupos").onclick = function (ev) {
    var b = ev.target.closest("button")
    if (!b) return
    if (b.dataset.editar) editarGrupo(gruposPorId[b.dataset.editar])
    if (b.dataset.pausar) pausarGrupo(gruposPorId[b.dataset.pausar])
    if (b.dataset.membros) carregarMembros(gruposPorId[b.dataset.membros])
    if (b.dataset.cargo) editarMembro(JSON.parse(decodeURIComponent(b.dataset.cargo)))
  }
  function salvarGrupo(g, motivo) {
    return rpc("mobile_platform_update_group", { target_club_id: g.id, target_name: g.name.trim(), target_group_type: g.groupType, target_chapter_name: (g.chapterName || "").trim(), target_city: g.city.trim(), target_description: (g.description || "").trim(), target_motto: (g.motto || "").trim(), target_entry_mode: g.entryMode, target_status: g.status, target_billing_mode: g.billingMode, target_monthly_fee_cents: g.monthlyFeeCents, target_trial_days: g.trialDays, target_reason: motivo })
  }
  function editarGrupo(g) {
    var tipos = ["motoclube", "motogrupo", "motocoletivo"].map(function (t) { return '<option value="' + t + '"' + (g.groupType === t ? " selected" : "") + ">" + t + "</option>" }).join("")
    janela("Editar " + g.name,
      '<label>Nome<input id="g-nome" value="' + esc(g.name) + '"></label><label>Tipo<select id="g-tipo">' + tipos + "</select></label>" +
      '<label>Cidade<input id="g-cidade" value="' + esc(g.city) + '"></label><label>Regional / capítulo<input id="g-capitulo" value="' + esc(g.chapterName || "") + '"></label>' +
      '<label>Lema<input id="g-lema" value="' + esc(g.motto || "") + '"></label><label>Descrição<input id="g-descricao" value="' + esc(g.description || "") + '"></label>' +
      '<label>Entrada<select id="g-entrada"><option value="request"' + (g.entryMode === "request" ? " selected" : "") + '>Com pedido</option><option value="direct"' + (g.entryMode === "direct" ? " selected" : "") + ">Direta</option></select></label>",
      async function (motivo) {
        await salvarGrupo(Object.assign({}, g, { name: $("g-nome").value, groupType: $("g-tipo").value, city: $("g-cidade").value, chapterName: $("g-capitulo").value, motto: $("g-lema").value, description: $("g-descricao").value, entryMode: $("g-entrada").value }), motivo)
        carregarGrupos()
      })
  }
  function pausarGrupo(g) {
    var pausar = g.status === "approved"
    janela((pausar ? "Pausar " : "Reativar ") + g.name, "<p>" + (pausar ? "O grupo some das buscas e para de receber pedidos de entrada até ser reativado. Nada é apagado." : "O grupo volta a aparecer e a receber pedidos.") + "</p>",
      async function (motivo) { await salvarGrupo(Object.assign({}, g, { status: pausar ? "suspended" : "approved" }), motivo); carregarGrupos() })
  }
  var cargos = { president: "Presidente / líder", admin: "Administrador", road_captain: "Capitão de estrada", member: "Integrante" }
  async function carregarMembros(g) {
    var alvo = "membros-" + g.id
    try {
      var r = await rpc("mobile_platform_admin_page", { target_section: "members", target_query: g.name, target_filter: "all", target_page: 1, target_page_size: 50 })
      var lista = r.items.filter(function (m) { return m.clubId === g.id })
      $(alvo).innerHTML = lista.length ? lista.map(function (m) {
        return '<div class="item"><div class="texto"><b>' + esc(m.displayName) + "</b>" + esc(cargos[m.role] || m.role) + " · " + esc(m.approvalStatus) + '</div><div class="acoes"><button class="botao claro" data-cargo="' + encodeURIComponent(JSON.stringify(m)) + '">Mudar</button></div></div>'
      }).join("") : '<p class="fraco">Sem integrantes.</p>'
    } catch (e) { falha(alvo, e) }
  }
  function editarMembro(m) {
    var opcoes = Object.keys(cargos).map(function (c) { return '<option value="' + c + '"' + (m.role === c ? " selected" : "") + ">" + cargos[c] + "</option>" }).join("")
    var situacoes = ["approved", "pending", "rejected", "suspended"].map(function (s) { return '<option value="' + s + '"' + (m.approvalStatus === s ? " selected" : "") + ">" + s + "</option>" }).join("")
    janela(m.displayName + " · " + m.clubName, '<label>Cargo<select id="m-cargo">' + opcoes + '</select></label><label>Situação<select id="m-situacao">' + situacoes + "</select></label><p class=\"fraco\">Dar \"Presidente / líder\" aqui passa a presidência na hora, sem pedir aceite.</p>",
      async function (motivo) {
        await rpc("mobile_platform_manage_member", { target_member_id: m.id, target_role: $("m-cargo").value, target_approval_status: $("m-situacao").value, target_billing_status: m.billingStatus, target_reason: motivo })
        carregarMembros({ id: m.clubId, name: m.clubName })
      })
  }
  async function carregarPedidos() {
    try {
      var r = await rpc("mobile_platform_admin_page", { target_section: "group_requests", target_query: "", target_filter: "all", target_page: 1, target_page_size: 50 })
      $("pedidos-grupos").innerHTML = r.items.length ? r.items.map(function (p) {
        return '<div class="item"><div class="texto"><b>' + esc(p.clubName) + "</b>" + esc(p.groupType) + " · " + esc(p.city) + "<br>Presidente: " + esc(p.presidentName) + " (" + esc(p.presidentEmail) + ")<br><span class=\"fraco\">" + esc(p.evidenceNote || "") + " · " + data(p.createdAt) + '</span></div><div class="acoes"><button class="botao" data-aprovar="' + p.id + '">Aprovar</button><button class="botao claro" data-recusar="' + p.id + '">Recusar</button></div></div>'
      }).join("") : '<p class="fraco">Nenhum pedido.</p>'
    } catch (e) { falha("pedidos-grupos", e) }
    try {
      var b = await rpc("mobile_platform_admin_page", { target_section: "badge_requests", target_query: "", target_filter: "all", target_page: 1, target_page_size: 50 })
      $("pedidos-brasao").innerHTML = b.items.length ? b.items.map(function (p) {
        return '<div class="item"><img class="brasao" alt="" src="' + esc(p.logoUrl) + '"><div class="texto"><b>' + esc(p.clubName) + "</b>Pedido de " + esc(p.requesterName) + " · " + data(p.createdAt) + '</div><div class="acoes"><button class="botao" data-brasao-ok="' + p.id + '">Aprovar</button><button class="botao claro" data-brasao-nao="' + p.id + '">Recusar</button></div></div>'
      }).join("") : '<p class="fraco">Nenhum pedido.</p>'
    } catch (e) { falha("pedidos-brasao", e) }
  }
  $("pedidos-grupos").onclick = function (ev) {
    var b = ev.target.closest("button"); if (!b) return
    var id = b.dataset.aprovar || b.dataset.recusar, aprovar = Boolean(b.dataset.aprovar)
    janela(aprovar ? "Aprovar grupo" : "Recusar grupo", aprovar ? "<p>V1 gratuita: o grupo entra sem mensalidade.</p>" : "", async function (motivo) {
      await rpc("mobile_platform_review_group_request", { target_request_id: id, target_decision: aprovar ? "approved" : "rejected", target_reason: motivo, target_monthly_fee_cents: 0, target_trial_days: 0, target_billing_mode: "free" })
      carregarPedidos(); carregarGrupos()
    })
  }
  $("pedidos-brasao").onclick = function (ev) {
    var b = ev.target.closest("button"); if (!b) return
    var id = b.dataset.brasaoOk || b.dataset.brasaoNao, aprovar = Boolean(b.dataset.brasaoOk)
    janela(aprovar ? "Aprovar brasão" : "Recusar brasão", "", async function (motivo) {
      await rpc("mobile_platform_review_badge_request", { target_request_id: id, target_decision: aprovar ? "approved" : "rejected", target_reason: motivo })
      carregarPedidos(); carregarGrupos()
    })
  }

  // ---------- Usuários ----------
  var temporizadorUsuario
  $("busca-usuario").oninput = function () { clearTimeout(temporizadorUsuario); temporizadorUsuario = setTimeout(function () { carregarUsuarios(true) }, 300) }
  $("mais-usuarios").onclick = function () { carregarUsuarios(false) }
  async function carregarUsuarios(doZero) {
    if (doZero) { paginaUsuarios = 1; $("lista-usuarios").innerHTML = "" } else paginaUsuarios++
    try {
      var r = await rpc("admin_web_users", { p_query: $("busca-usuario").value, p_page: paginaUsuarios, p_page_size: 30 })
      $("total-usuarios").textContent = num(r.total) + " conta(s)"
      $("lista-usuarios").insertAdjacentHTML("beforeend", r.items.map(function (u) {
        var grupos = u.groups.map(function (g) { return esc(g.name) + " (" + esc(cargos[g.role] || g.role) + ")" }).join(", ")
        return '<div class="item"><div class="texto"><b>' + esc(u.roadName || u.displayName || "Sem nome") + "</b>" + esc(u.email) + (u.city ? " · " + esc(u.city) : "") +
          "<br>" + (u.admin ? '<span class="selo ok">' + esc(u.admin.replace(":active", "").replace("super_admin", "superadmin").replace("owner", "proprietário")) + "</span>" : "") +
          '<span class="selo ' + (u.appRecent ? "ok" : "alerta") + '">' + (u.appRecent ? "app recente" : "app antigo (antes de 22/10)") + "</span>" +
          '<span class="fraco">Conta de ' + data(u.createdAt) + " · último acesso " + data(u.lastSignInAt, true) + " · " + num(u.trips) + " viagem(ns)" + (u.lastTripAt ? ", última em " + data(u.lastTripAt) : "") + "</span>" +
          (grupos ? '<br><span class="fraco">Grupos: ' + grupos + "</span>" : "") + "</div></div>"
      }).join(""))
      mostrar("mais-usuarios", paginaUsuarios * r.pageSize < r.total)
    } catch (e) { falha("lista-usuarios", e) }
  }
  async function carregarAdmins() {
    try {
      var r = await rpc("mobile_platform_admin_page", { target_section: "admins", target_query: "", target_filter: "all", target_page: 1, target_page_size: 50 })
      $("lista-admins").innerHTML = r.items.map(function (a) {
        var ativo = a.status === "active"
        return '<div class="item"><div class="texto"><b>' + esc(a.displayName) + "</b>" + esc(a.email) + " · " + (a.role === "owner" ? "proprietário" : "superadmin") + (ativo ? "" : " · suspenso") + "</div>" +
          (a.role === "owner" ? "" : '<div class="acoes"><button class="botao ' + (ativo ? "perigo" : "") + '" data-admin="' + esc(a.email) + '" data-acao="' + (ativo ? "suspend" : "activate") + '">' + (ativo ? "Suspender" : "Reativar") + "</button></div>") + "</div>"
      }).join("")
    } catch (e) { falha("lista-admins", e) }
  }
  $("lista-admins").onclick = function (ev) {
    var b = ev.target.closest("button"); if (!b) return
    janela((b.dataset.acao === "suspend" ? "Suspender " : "Reativar ") + b.dataset.admin, "", async function (motivo) {
      await rpc("mobile_platform_manage_admin", { target_email: b.dataset.admin, target_action: b.dataset.acao, target_reason: motivo }); carregarAdmins()
    })
  }
  $("form-admin").onsubmit = function (ev) {
    ev.preventDefault()
    var email = $("email-admin").value.trim()
    janela("Dar superadministração a " + email, "<p>A pessoa passa a ver este painel e a área de administração do app.</p>", async function (motivo) {
      await rpc("mobile_platform_manage_admin", { target_email: email, target_action: "grant", target_reason: motivo }); $("email-admin").value = ""; carregarAdmins()
    })
  }

  // ---------- Denúncias e eventos ----------
  $("filtro-denuncia").onchange = carregarDenuncias
  var tipos = { post: "Publicação", event: "Evento", message: "Mensagem", profile: "Pessoa" }
  async function carregarDenuncias() {
    try {
      var r = await rpc("mobile_platform_content_reports", { target_filter: $("filtro-denuncia").value, target_page: 1, target_page_size: 50 })
      $("lista-denuncias").innerHTML = r.items.length ? r.items.map(function (d) {
        return '<div class="item"><div class="texto"><b>' + esc(tipos[d.targetType] || d.targetType) + ": " + esc(d.targetName) + "</b>" + esc(d.reason) + (d.details ? " — " + esc(d.details) : "") +
          (d.excerpt ? '<br><span class="fraco">"' + esc(d.excerpt) + '"</span>' : "") + '<br><span class="fraco">Por ' + esc(d.reporterName) + " · " + data(d.createdAt, true) + " · " + num(d.targetReports) + " denúncia(s) do mesmo conteúdo" + (d.contentHidden ? " · oculto" : "") + "</span></div>" +
          '<div class="acoes">' + (d.contentHidden ? '<button class="botao claro" data-decisao="restore" data-id="' + d.id + '">Restaurar</button>' : '<button class="botao perigo" data-decisao="hide" data-id="' + d.id + '">Ocultar</button>') +
          '<button class="botao claro" data-decisao="dismiss" data-id="' + d.id + '">Descartar</button><button class="botao claro" data-decisao="reviewed" data-id="' + d.id + '">Revisado</button></div></div>'
      }).join("") : '<p class="fraco">Nenhuma denúncia.</p>'
    } catch (e) { falha("lista-denuncias", e) }
  }
  $("lista-denuncias").onclick = function (ev) {
    var b = ev.target.closest("button"); if (!b) return
    var nomes = { hide: "Ocultar conteúdo", restore: "Restaurar conteúdo", dismiss: "Descartar denúncia", reviewed: "Marcar como revisada" }
    janela(nomes[b.dataset.decisao], "", async function (motivo) {
      await rpc("mobile_platform_resolve_content_report", { target_report_id: Number(b.dataset.id), target_decision: b.dataset.decisao, target_reason: motivo }); carregarDenuncias()
    })
  }
  async function carregarEventos() {
    try {
      var r = await rpc("mobile_platform_admin_page", { target_section: "events", target_query: "", target_filter: "all", target_page: 1, target_page_size: 30 })
      $("lista-eventos").innerHTML = r.items.length ? r.items.map(function (e) {
        return '<div class="item"><div class="texto"><b>' + esc(e.title) + "</b>" + data(e.startsAt, true) + " · " + esc(e.audienceType) + ' · <span class="selo">' + esc(e.status) + "</span></div>" +
          (e.status === "canceled" ? "" : '<div class="acoes"><button class="botao perigo" data-cancelar="' + e.id + '">Cancelar</button></div>') + "</div>"
      }).join("") : '<p class="fraco">Nenhum evento.</p>'
    } catch (e) { falha("lista-eventos", e) }
  }
  $("lista-eventos").onclick = function (ev) {
    var b = ev.target.closest("button"); if (!b) return
    janela("Cancelar evento", "<p>Quem confirmou presença deixa de ver o evento como ativo.</p>", async function (motivo) {
      await rpc("mobile_platform_review_event", { target_event_id: Number(b.dataset.cancelar), target_decision: "canceled", target_reason: motivo }); carregarEventos()
    })
  }

  iniciar()
})()
