// Aba Poderes (decisão 502 do app, 25/11/2026): quem vê e quem controla o quê dentro de um grupo, e a árvore
// o organograma de cada grupo (organograma.js, decisão 504), que a superadministração monta aqui.
// A grade vem do servidor (admin_web_power_rules); as linhas "conferida por teste" são provadas pelo e2e
// mapa-de-poderes-502 contra as funções reais.
window.painelPoderes = function (ajuda) {
  var esc = ajuda.esc, rpc = ajuda.rpc, $ = ajuda.$
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
  // Decisão 504: a hierarquia do grupo virou o organograma editável (organograma.js).
  var organograma = window.painelOrganograma(ajuda)
  function abrirGrupo(id) {
    $("grupos-poderes").querySelectorAll("[data-grupo]").forEach(function (b) { b.classList.toggle("escolhido", b.dataset.grupo === String(id)) })
    organograma.abrir(id)
  }

  var temporizador
  $("busca-poderes").oninput = function () { clearTimeout(temporizador); temporizador = setTimeout(buscar, 300) }
  $("grupos-poderes").onclick = function (ev) { var b = ev.target.closest("[data-grupo]"); if (b) abrirGrupo(b.dataset.grupo) }
  return { abrir: function () { carregarGrade(); buscar() } }
}
