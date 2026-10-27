// Tela de consentimento do OAuth do MANO (MCP, decisões do proprietário de 27/10/2026).
// O Supabase confere cliente, redirect e PKCE antes de mandar a pessoa para cá; esta página só mostra o pedido e
// registra Permitir ou Negar. Não guarda segredo nenhum (só a chave pública do projeto, a mesma do app).
(function () {
  var ambientes = {
    producao: { nome: "", url: "https://mpycjhboiaoocjmtkeoh.supabase.co", chave: "sb_publishable_4CGXNwTULxigv1PVoLiXUA_xUXUQssk" },
    testes: { nome: "Testes (HML)", url: "https://ixgrttjjzfuxkohuyatj.supabase.co", chave: "sb_publishable_I-GtG0bDrzkUknW6ISF2FA_vO3MbXMV" },
  }
  var parametros = new URLSearchParams(location.search)
  var testes = location.pathname.indexOf("/oauth/testes") === 0 || parametros.get("ambiente") === "testes"
  var amb = testes ? ambientes.testes : ambientes.producao
  // Sessão só nesta aba: num computador emprestado a conta não fica entrada depois de fechar.
  var sb = window.supabase.createClient(amb.url, amb.chave, { auth: { persistSession: true, storage: window.sessionStorage, storageKey: "mano-oauth-" + (testes ? "hml" : "prod") } })
  var $ = function (id) { return document.getElementById(id) }
  var pedidoId = parametros.get("authorization_id")
  var secoes = ["carregando", "entrar", "pedido", "falha"]

  $("ambiente").textContent = amb.nome
  function mostrar(qual) { secoes.forEach(function (id) { $(id).hidden = id !== qual }) }
  function falhar(titulo, texto) { $("falha-titulo").textContent = titulo; $("falha-texto").textContent = texto; mostrar("falha") }
  function destino(url) { try { return new URL(url).host || url } catch (e) { return url || "endereço não informado" } }
  function voltar(resposta) {
    var url = resposta && (resposta.redirect_url || resposta.redirect_to)
    if (!url) throw new Error("O servidor não informou para onde voltar.")
    location.replace(url)
  }

  $("google").onclick = function () { sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href } }) }
  $("form-senha").onsubmit = async function (ev) {
    ev.preventDefault()
    $("erro-entrar").textContent = ""
    var r = await sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("senha").value })
    if (r.error) $("erro-entrar").textContent = "Não foi possível entrar: confira e-mail e senha."
  }
  $("trocar").onclick = async function () { await sb.auth.signOut(); location.reload() }

  async function decidir(permitir) {
    $("permitir").disabled = $("negar").disabled = true
    $("erro-pedido").textContent = ""
    try {
      var r = permitir ? await sb.auth.oauth.approveAuthorization(pedidoId) : await sb.auth.oauth.denyAuthorization(pedidoId)
      if (r.error) throw r.error
      voltar(r.data)
    } catch (e) {
      $("erro-pedido").textContent = "Não foi possível registrar sua resposta. Peça para a IA conectar de novo."
      $("permitir").disabled = $("negar").disabled = false
    }
  }
  $("permitir").onclick = function () { decidir(true) }
  $("negar").onclick = function () { decidir(false) }

  var iniciando = false
  async function iniciar() {
    if (iniciando) return
    iniciando = true
    try {
      if (!pedidoId) return falhar("Pedido inválido", "Este endereço só funciona quando uma IA pede para se conectar ao MANO. Volte para a IA e tente conectar de novo.")
      var s = (await sb.auth.getSession()).data.session
      if (!s) return mostrar("entrar")
      var r = await sb.auth.oauth.getAuthorizationDetails(pedidoId)
      if (r.error) return falhar("Pedido vencido", "Este pedido de conexão venceu ou já foi respondido. Volte para a IA e tente conectar de novo.")
      // Quem já permitiu esta IA antes volta direto, sem nova pergunta.
      if (!("authorization_id" in r.data)) return voltar(r.data)
      var cliente = r.data.client || {}
      $("cliente").textContent = cliente.name || "Um aplicativo sem nome"
      $("conta").textContent = (r.data.user && r.data.user.email) || s.user.email || ""
      $("destino").textContent = destino(r.data.redirect_uri || cliente.uri)
      mostrar("pedido")
    } catch (e) {
      falhar("Algo deu errado", "Não foi possível carregar o pedido agora. Volte para a IA e tente conectar de novo.")
    } finally {
      iniciando = false
    }
  }
  sb.auth.onAuthStateChange(function (evento) { if (evento === "SIGNED_IN") iniciar() })
  iniciar()
})()
