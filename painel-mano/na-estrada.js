// Aba "Na estrada" do painel (decisão 410 do app, 02/11/2026): quem está rodando agora. O servidor decide quem
// aparece com nome (o colete da pessoa) e manda os demais só como manchas de ~5 km, 15 min atrasadas. Lê a cada
// 30 s, só com a aba aberta e visível, como o acompanhamento no site (decisão 408).
window.painelNaEstrada = function (ajuda) {
  var $ = function (id) { return document.getElementById(id) }
  var esc = ajuda.esc, num = ajuda.num
  var vazio = { type: "FeatureCollection", features: [] }
  var mapa = null, pronto = false, aberta = false, temporizador = null, vez = 0
  var escolhida = null, enquadrou = false, ultimo = null

  function duracao(ms) {
    var min = Math.max(0, Math.round(ms / 60000))
    return min < 60 ? min + " min" : Math.floor(min / 60) + " h " + (min % 60) + " min"
  }
  function haQuanto(valor) {
    var s = Math.max(0, Math.round((Date.now() - new Date(valor)) / 1000))
    return s < 90 ? s + " s" : duracao(s * 1000)
  }
  function pontos(lista, propriedades) {
    return { type: "FeatureCollection", features: lista.map(function (x) { return { type: "Feature", properties: propriedades(x), geometry: { type: "Point", coordinates: [x.lon, x.lat] } } }) }
  }

  // Seta da moto, desenhada aqui para não depender de imagem externa; gira com o rumo.
  function seta() {
    var c = document.createElement("canvas")
    c.width = c.height = 40
    var g = c.getContext("2d")
    g.beginPath(); g.moveTo(20, 3); g.lineTo(34, 36); g.lineTo(20, 28); g.lineTo(6, 36); g.closePath()
    g.lineJoin = "round"; g.lineWidth = 3; g.strokeStyle = "#ffffff"; g.stroke()
    g.fillStyle = "#a7181d"; g.fill()
    return g.getImageData(0, 0, 40, 40)
  }

  function criarMapa() {
    mapa = new maplibregl.Map({ container: "mapa-estrada", style: "https://tiles.openfreemap.org/styles/liberty", center: [-47.9, -15.8], zoom: 3.4, attributionControl: { compact: true } })
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }))
    mapa.on("load", function () {
      mapa.addImage("moto-seta", seta(), { pixelRatio: 2 })
      mapa.addSource("estrada-manchas", { type: "geojson", data: vazio })
      mapa.addSource("estrada-rastro", { type: "geojson", data: vazio })
      mapa.addSource("estrada-nomes", { type: "geojson", data: vazio })
      mapa.addLayer({ id: "estrada-manchas", type: "circle", source: "estrada-manchas", paint: {
        "circle-color": "#5b5a52", "circle-opacity": 0.35, "circle-stroke-color": "#5b5a52", "circle-stroke-width": 1,
        "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 9, 10, 13, 150],
      } })
      mapa.addLayer({ id: "estrada-manchas-numero", type: "symbol", source: "estrada-manchas", layout: { "text-field": ["to-string", ["get", "riders"]], "text-size": 12, "text-font": ["Noto Sans Regular"], "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } })
      mapa.addLayer({ id: "estrada-rastro", type: "line", source: "estrada-rastro", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#224f5a", "line-width": 4, "line-opacity": 0.8 } })
      mapa.addLayer({ id: "estrada-nomes", type: "symbol", source: "estrada-nomes", layout: {
        "icon-image": "moto-seta", "icon-rotate": ["get", "heading"], "icon-rotation-alignment": "map", "icon-allow-overlap": true,
        "text-field": ["get", "alias"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.3], "text-anchor": "top", "text-optional": true,
      }, paint: { "text-color": "#171814", "text-halo-color": "#ffffff", "text-halo-width": 1.5 } })
      mapa.on("click", "estrada-nomes", function (ev) { escolher(ev.features[0].properties.tripId) })
      mapa.on("mouseenter", "estrada-nomes", function () { mapa.getCanvas().style.cursor = "pointer" })
      mapa.on("mouseleave", "estrada-nomes", function () { mapa.getCanvas().style.cursor = "" })
      pronto = true
      if (ultimo) desenhar(ultimo)
    })
  }

  function desenhar(d) {
    mapa.getSource("estrada-nomes").setData(pontos(d.named, function (n) { return { tripId: n.tripId, alias: n.alias, heading: Number(n.heading || 0) } }))
    mapa.getSource("estrada-manchas").setData(pontos(d.cells, function (c) { return { riders: c.riders } }))
    mapa.getSource("estrada-rastro").setData(d.trail ? { type: "Feature", properties: {}, geometry: d.trail } : vazio)
    var todos = d.named.concat(d.cells)
    if (!enquadrou && todos.length) {
      var b = new maplibregl.LngLatBounds()
      todos.forEach(function (x) { b.extend([x.lon, x.lat]) })
      mapa.fitBounds(b, { padding: 60, maxZoom: 9, duration: 0 })
      enquadrou = true
    }
  }

  function mostrar(d) {
    var t = d.totals
    var cartoes = [
      [t.riding, "na estrada agora"], [t.named, "com nome no mapa"],
      [t.anonymous, "sem nome · " + num(t.onMap) + " como mancha"], [t.noSignal, "viagem aberta sem sinal há 15 min"],
    ]
    $("numeros-estrada").innerHTML = cartoes.map(function (c) { return '<div class="numero"><b>' + num(c[0]) + "</b><span>" + esc(c[1]) + "</span></div>" }).join("")
    $("estrada-hora").textContent = "Atualizado às " + new Date().toLocaleTimeString("pt-BR") + ". Lê de novo a cada 30 s enquanto esta aba estiver aberta."
    $("lista-estrada").innerHTML = d.named.length ? d.named.map(function (n) {
      var detalhes = [n.speedKmh != null ? Math.round(n.speedKmh) + " km/h" : null, num(n.km) + " km nesta viagem", "na estrada há " + duracao(Date.now() - new Date(n.startedAt)), "última posição há " + haQuanto(n.updatedAt)]
      var sim = n.tripId === escolhida
      return '<div class="item' + (sim ? " escolhida" : "") + '"><div class="texto"><b>' + esc(n.alias) + '</b><span class="fraco">' + esc(detalhes.filter(Boolean).join(" · ")) + "</span></div>"
        + '<div class="acoes"><button class="botao claro" data-viagem="' + n.tripId + '">' + (sim ? "Esconder rastro" : "Ver no mapa") + "</button></div></div>"
    }).join("") : '<p class="fraco">Ninguém com nome na estrada agora.</p>'
  }

  async function ler() {
    clearTimeout(temporizador)
    if (!aberta || document.visibilityState !== "visible") return
    var minha = ++vez
    try {
      var d = await ajuda.rpc("admin_web_live_road", { p_trail_trip_id: escolhida })
      if (minha !== vez) return
      if (escolhida && !d.named.some(function (n) { return n.tripId === escolhida })) escolhida = null
      ultimo = d
      mostrar(d)
      if (pronto) desenhar(d)
      $("estrada-erro").textContent = ""
    } catch (e) {
      if (minha !== vez) return
      $("estrada-erro").textContent = e.message
    }
    if (aberta) temporizador = setTimeout(ler, 30000)
  }

  function escolher(tripId) {
    escolhida = escolhida === tripId ? null : tripId
    var n = ultimo && ultimo.named.filter(function (x) { return x.tripId === escolhida })[0]
    if (n && mapa) mapa.flyTo({ center: [n.lon, n.lat], zoom: Math.max(mapa.getZoom(), 10) })
    ler()
  }

  $("lista-estrada").onclick = function (ev) {
    var b = ev.target.closest("[data-viagem]")
    if (b) escolher(Number(b.dataset.viagem))
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && aberta) ler() })

  return {
    abrir: function () { aberta = true; if (!mapa) criarMapa(); else mapa.resize(); ler() },
    fechar: function () { aberta = false; clearTimeout(temporizador) },
  }
}
