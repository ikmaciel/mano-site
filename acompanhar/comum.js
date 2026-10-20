// Acompanhamento ao vivo do MANO para quem está em casa (decisão de 14/10/2026: no manobrotherhood.com).
// Sem login e sem instalar nada: o código do link fica depois do "#" e nunca vai para o servidor do site.
// O APK de testes acrescenta ?ambiente=testes para ler o servidor de homologação.
(function () {
  var ambientes = {
    producao: { url: "https://mpycjhboiaoocjmtkeoh.supabase.co", chave: "sb_publishable_4CGXNwTULxigv1PVoLiXUA_xUXUQssk" },
    testes: { url: "https://ixgrttjjzfuxkohuyatj.supabase.co", chave: "sb_publishable_I-GtG0bDrzkUknW6ISF2FA_vO3MbXMV" },
  }
  var AO_VIVO_MS = 90000

  function hora(ms) { return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }
  function haQuanto(ms) {
    var min = Math.max(0, Math.round(ms / 60000))
    if (min < 1) return "agora há pouco"
    if (min < 60) return "há " + min + " min"
    var h = Math.floor(min / 60), resto = min % 60
    return resto ? "há " + h + " h " + resto + " min" : "há " + h + " h"
  }

  // Mesmas regras da página antiga: ao vivo até 90 s; depois, "sem sinal desde" com o horário do último ponto.
  function sinal(o) {
    var perto = o.lugar ? ", perto de " + o.lugar : ""
    if (o.encerrada) return { aoVivo: false, selo: "✓ VIAGEM ENCERRADA", texto: (o.encerradaEm ? "Viagem encerrada às " + hora(o.encerradaEm) + ". " : "Viagem encerrada. ") + "Por privacidade, a posição e o trajeto não aparecem mais." }
    if (!o.atualizadoEm) return { aoVivo: false, selo: o.conectado ? "○ AGUARDANDO SINAL" : "○ RECONECTANDO", texto: "O mapa será atualizado assim que o celular enviar a primeira localização." }
    var idade = Math.max(0, o.agoraServidor - o.atualizadoEm)
    if (idade <= AO_VIVO_MS && o.conectado) return { aoVivo: true, selo: "● AO VIVO", texto: "Posição atualizada agora" + perto + "." }
    return { aoVivo: false, selo: o.conectado ? "○ SEM SINAL DESDE " + hora(o.atualizadoEm) : "○ RECONECTANDO", texto: "Sem sinal desde " + hora(o.atualizadoEm) + " (" + haQuanto(idade) + ")" + perto + ". O marcador mostra o último ponto recebido. Quando o sinal voltar, o trecho percorrido sem conexão aparece no mapa." }
  }

  function escapar(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] }) }

  // Busca o retrato a cada 8 s. 404/410 encerram o link; outras falhas só tentam de novo.
  function acompanhar(funcao, aoReceber, aoFalhar, aoEncerrar) {
    var token = location.hash.slice(1)
    var amb = new URLSearchParams(location.search).get("ambiente") === "testes" ? ambientes.testes : ambientes.producao
    if (!token) { aoFalhar("Este link de acompanhamento está incompleto.", false); return }
    var recebeu = false, timer = 0
    // 19/10/2026: a rota (até ~1,8 MB) vem só na primeira vez ou quando muda; depois o servidor responde "igual".
    var rotaVersao = null, rotaGuardada = null
    function buscar() {
      // MP-04 (roteiro de 17/10/2026): sem limite de tempo, um pedido preso deixava a página em "Carregando" para sempre.
      var ctrl = window.AbortController ? new AbortController() : null, limite = ctrl ? setTimeout(function () { ctrl.abort() }, 10000) : 0
      fetch(amb.url + "/functions/v1/" + funcao, { method: "POST", cache: "no-store", signal: ctrl ? ctrl.signal : undefined, headers: { "content-type": "application/json", apikey: amb.chave }, body: JSON.stringify({ action: "snapshot", shareToken: token, routeVersion: rotaVersao }) })
        .then(function (r) { return r.json().catch(function () { return {} }).then(function (d) { return { r: r, d: d } }) })
        .then(function (x) {
          if (x.r.status === 404 || x.r.status === 410) { clearInterval(timer); aoEncerrar(x.d.error || "Este acompanhamento terminou."); return }
          if (!x.r.ok) throw new Error(x.d.error || "Sem conexão com o servidor agora.")
          recebeu = true
          if (x.d.status === "ended") clearInterval(timer)
          if (x.d.routeUnchanged && rotaGuardada) { x.d.route = rotaGuardada.route; x.d.routeCoordinates = rotaGuardada.routeCoordinates }
          else if (x.d.routeUnchanged) rotaVersao = null
          else { rotaVersao = x.d.routeVersion || null; rotaGuardada = { route: x.d.route, routeCoordinates: x.d.routeCoordinates } }
          aoReceber(x.d)
        })
        .catch(function (e) { aoFalhar(e && e.name === "AbortError" ? "O servidor demorou a responder." : e && e.message ? e.message : "Acompanhamento indisponível.", recebeu) })
        .then(function () { clearTimeout(limite) })
    }
    timer = setInterval(buscar, 8000); buscar()
  }

  // Decisão do proprietário (20/10/2026): mapa do OpenFreeMap, o mesmo do app. Se ele não carregar
  // (servidor fora, navegador sem WebGL ou biblioteca bloqueada), cai no mapa do OpenStreetMap.
  var OPENFREEMAP = "https://tiles.openfreemap.org/styles/liberty"
  function reserva(mapa) {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mapa)
  }
  function temWebGL() {
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")) } catch (e) { return false }
  }
  function fundoDoMapa(mapa) {
    if (!L.maplibreGL || !window.maplibregl || !temWebGL()) return reserva(mapa)
    var trocou = false, carregou = false
    var vetor = L.maplibreGL({ style: OPENFREEMAP, attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © OpenStreetMap' }).addTo(mapa)
    var paraReserva = function () {
      if (trocou || carregou) return
      trocou = true
      mapa.removeLayer(vetor)
      reserva(mapa)
    }
    var gl = vetor.getMaplibreMap()
    gl.once("load", function () { carregou = true })
    gl.on("error", paraReserva)
    setTimeout(paraReserva, 10000)
  }

  function novoMapa(no) {
    var mapa = L.map(no).setView([-15.8, -47.9], 5)
    fundoDoMapa(mapa)
    // O mapa nasce antes de o espaço dele ter o tamanho final; sem recalcular, linhas e enquadramento somem.
    var ajustar = function () { mapa.invalidateSize() }
    setTimeout(ajustar, 100)
    if (window.ResizeObserver) new ResizeObserver(ajustar).observe(no)
    else window.addEventListener("resize", ajustar)
    return mapa
  }

  // Motos ilustradas do app: vermelha = quem está sendo acompanhado; verde = companheiro identificado;
  // cinza = anônimo ("Motociclista MANO"). Girada para o rumo quando ele existe.
  function moto(cor, opcoes) {
    opcoes = opcoes || {}
    var giro = Number.isFinite(opcoes.rumo) ? ' style="transform:rotate(' + Math.round(opcoes.rumo) + 'deg)"' : ""
    return L.divIcon({ className: "", iconSize: [36, 36], iconAnchor: [18, 18],
      html: '<span class="moto' + (opcoes.parado ? " cinza" : "") + '"><img src="/motos/' + cor + '.webp" alt=""' + giro + ">" + (opcoes.aviso ? "<b>" + opcoes.aviso + "</b>" : "") + "</span>" + (opcoes.nome || "") })
  }

  window.MANO = { sinal: sinal, hora: hora, escapar: escapar, acompanhar: acompanhar, novoMapa: novoMapa, moto: moto, AO_VIVO_MS: AO_VIVO_MS }
})()
