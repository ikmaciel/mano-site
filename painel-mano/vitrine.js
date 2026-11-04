// Aba Adesivos do painel como vitrines (decisão 430 do app, 04/11/2026): cada lugar é a porta de vidro de um
// restaurante de estrada, com os brasões colados ali e quantas vezes cada um foi colado (×N). Nenhum brasão fica por
// cima de outro, como manda a regra da estrada. Tocar num brasão abre quem colou, para moderar.
window.painelVitrine = function (ajuda) {
  var esc = ajuda.esc, num = ajuda.num, data = ajuda.data, categorias = ajuda.categorias
  var MANO = "/painel-mano/brasao-mano.webp"

  // Número fixo por texto: o giro e a ordem dos brasões não mudam de uma carga para outra.
  function sorteio(texto) {
    var h = 2166136261
    for (var i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619) }
    return (h >>> 0) / 4294967296
  }
  function chaveDoGrupo(clubId) { return clubId == null ? "mano" : String(clubId) }
  function chaveDoAdesivo(p) {
    if (p.clubId !== undefined) return chaveDoGrupo(p.clubId)
    return p.scope === "club" ? "nome:" + p.clubName : "mano"
  }
  function chaveDoBrasao(b) { return b.chave || chaveDoGrupo(b.clubId) }

  // O servidor de antes da 430 não manda os brasões: monta pelo nome do grupo, sem a imagem.
  function brasoes(l) {
    if (Array.isArray(l.badges)) return l.badges
    var porChave = {}, ordem = []
    l.patches.forEach(function (p) {
      var k = chaveDoAdesivo(p)
      if (!porChave[k]) { porChave[k] = { chave: k, clubId: k === "mano" ? null : k, name: p.clubName, logoPath: null, active: 0, invalidated: 0 }; ordem.push(k) }
      if (p.invalidatedAt) porChave[k].invalidated++; else porChave[k].active++
    })
    return ordem.map(function (k) { return porChave[k] })
  }
  function acharBrasao(l, k) { return brasoes(l).filter(function (b) { return chaveDoBrasao(b) === k })[0] }

  // Como na tela principal do app: brasão recortado (fundo transparente) vira adesivo recortado; o que vem em
  // quadrado fica redondo; grupo sem imagem mostra as iniciais. Só dá para saber depois que a imagem carrega.
  var formatos = {}
  function iniciais(nome) { return String(nome || "Grupo").split(/\s+/).slice(0, 2).map(function (parte) { return parte.charAt(0) }).join("").toUpperCase() }
  function monograma(nome) { return '<span class="iniciais" aria-hidden="true">' + esc(iniciais(nome)) + "</span>" }
  function imagem(b, tamanho) {
    var estilo = ' style="--tam:' + tamanho + 'px"'
    var logo = typeof b.logoPath === "string" && /^https:\/\//i.test(b.logoPath.trim()) ? b.logoPath.trim() : null
    if (chaveDoBrasao(b) === "mano") return '<span class="arte recortado"' + estilo + '><img src="' + MANO + '" alt=""></span>'
    if (!logo) return '<span class="arte monograma"' + estilo + ">" + monograma(b.name) + "</span>"
    var formato = formatos[logo]
    return '<span class="arte ' + (formato || "redondo") + '"' + estilo + (formato ? "" : " data-detectar") + ' data-nome="' + esc(b.name || "") + '">' +
      '<img src="' + esc(logo) + '" alt="" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer"></span>'
  }
  function detectar(img) {
    var arte = img.parentNode, url = img.getAttribute("src"), formato = formatos[url]
    if (!formato) {
      formato = "redondo"
      try {
        var lado = 24, tela = document.createElement("canvas")
        tela.width = tela.height = lado
        var pincel = tela.getContext("2d")
        pincel.drawImage(img, 0, 0, lado, lado)
        var px = pincel.getImageData(0, 0, lado, lado).data, borda = 0, vazios = 0
        for (var y = 0; y < lado; y++) for (var x = 0; x < lado; x++) {
          if (x && y && x < lado - 1 && y < lado - 1) continue
          borda++
          if (px[(y * lado + x) * 4 + 3] < 40) vazios++
        }
        if (vazios / borda > 0.3) formato = "recortado"
      } catch (e) { /* sem acesso aos pixels: fica redondo */ }
      formatos[url] = formato
    }
    arte.removeAttribute("data-detectar")
    arte.classList.remove("redondo")
    arte.classList.add(formato)
  }
  // Um ouvinte só no contêiner (load e error não sobem, por isso na captura).
  function observar(elemento) {
    elemento.addEventListener("load", function (ev) {
      if (ev.target.tagName === "IMG" && ev.target.parentNode.hasAttribute("data-detectar")) detectar(ev.target)
    }, true)
    elemento.addEventListener("error", function (ev) {
      var arte = ev.target.tagName === "IMG" ? ev.target.parentNode : null
      if (!arte || !arte.hasAttribute("data-nome")) return
      arte.className = "arte monograma"
      arte.removeAttribute("data-detectar")
      arte.innerHTML = monograma(arte.getAttribute("data-nome"))
    }, true)
  }
  function vezes(n) { return num(n) + (n === 1 ? " vez" : " vezes") }

  function adesivo(l, b) {
    var k = chaveDoBrasao(b)
    var giro = Math.round(sorteio(l.placeKey + "|" + k) * 200 - 100) / 10
    var desvio = Math.round(sorteio(k + "|" + l.placeKey) * 12 - 6)
    var tamanho = Math.round(Math.min(124, 76 + 16 * Math.log2(Math.max(1, b.active))))
    var arrancado = b.active === 0
    var rotulo = b.name + ": " + (arrancado ? "nenhum valendo" : "colado " + vezes(b.active)) + (b.invalidated ? ", " + num(b.invalidated) + " invalidado(s)" : "") + ". Toque para ver quem colou."
    var etiqueta = arrancado ? "<s>×" + num(b.invalidated) + "</s>" : "×" + num(b.active)
    return '<button type="button" class="adesivo' + (arrancado ? " arrancado" : "") + '" data-brasao="' + esc(k) + '" aria-expanded="false" title="' + esc(rotulo) + '" aria-label="' + esc(rotulo) + '" style="--giro:' + giro + "deg;--desvio:" + desvio + 'px">' +
      imagem(b, tamanho) + '<span class="vezes" aria-hidden="true">' + etiqueta + "</span></button>"
  }

  function lugar(l) {
    var lista = brasoes(l).slice().sort(function (a, b) { return sorteio(l.placeKey + chaveDoBrasao(a)) - sorteio(l.placeKey + chaveDoBrasao(b)) })
    var cidade = l.city && !/^próximo à estrada$/i.test(l.city) ? " · " + esc(l.city) : ""
    var mapa = l.latitude != null ? ' · <a href="https://www.openstreetmap.org/?mlat=' + Number(l.latitude) + "&mlon=" + Number(l.longitude) + "#map=17/" + Number(l.latitude) + "/" + Number(l.longitude) + '" target="_blank" rel="noopener">ver no mapa</a>' : ""
    var grupos = lista.filter(function (b) { return b.active > 0 }).length
    return '<article class="vitrine" data-lugar="' + esc(l.placeKey) + '">' +
      '<header class="letreiro"><div><b>' + esc(l.placeName) + "</b><span>" + esc(categorias[l.category] || "Local") + cidade + mapa + "</span></div>" +
      '<div class="placar"><b>' + num(l.active) + "</b><span>" + (l.active === 1 ? "adesivo" : "adesivos") + "</span></div></header>" +
      '<div class="vidro">' + lista.map(function (b) { return adesivo(l, b) }).join("") + "</div>" +
      '<footer class="rodape"><span class="selo">' + num(grupos) + (grupos === 1 ? " brasão" : " brasões") + "</span>" +
      (l.invalidated ? '<span class="selo alerta">' + num(l.invalidated) + " invalidado(s)</span>" : "") +
      (l.catalogActive ? "" : '<span class="selo alerta">fora do catálogo</span>') + "<span>último em " + data(l.lastAt, true) + "</span></footer>" +
      '<div class="ficha-vitrine" hidden></div></article>'
  }

  // Quem colou o brasão escolhido, com Invalidar e Restaurar (as linhas vêm do painel).
  function ficha(l, k, linha) {
    var b = acharBrasao(l, k)
    if (!b) return ""
    var adesivos = l.patches.filter(function (p) { return chaveDoAdesivo(p) === k })
    var total = b.active + b.invalidated
    return '<div class="ficha-topo">' + imagem(b, 48) + "<div><b>" + esc(b.name) + '</b><span class="fraco">' + (b.active ? "colado " + vezes(b.active) : "nenhum valendo") +
      (b.invalidated ? " · " + num(b.invalidated) + " invalidado(s)" : "") + '</span></div><button type="button" class="botao claro" data-fechar>Fechar</button></div>' +
      adesivos.map(linha).join("") +
      (total > adesivos.length ? '<p class="fraco">Mostrando ' + num(adesivos.length) + " de " + num(total) + ": a lista traz os 50 adesivos mais recentes do lugar.</p>" : "")
  }

  return { lugar: lugar, ficha: ficha, observar: observar }
}
