// Endereço do conector da IA (decisão 403 do app, 31/10/2026): a pessoa cola manobrotherhood.com/mcp na IA e este
// repasse leva o pedido à função mcp do Supabase. Assim a IA mostra o nome do MANO, e não o servidor do Supabase.
// Não guarda nada: só copia o pedido e devolve a resposta como veio.
const FUNCOES = {
  "/mcp": "https://mpycjhboiaoocjmtkeoh.supabase.co/functions/v1/mcp",
  "/mcp-testes": "https://ixgrttjjzfuxkohuyatj.supabase.co/functions/v1/mcp",
}

// Cabeçalhos que o Cloudflare põe no caminho; repassados ao Supabase (também atrás do Cloudflare), atrapalham.
const naoRepassar = nome => nome === "host" || nome === "cdn-loop" || nome === "content-length" || nome.startsWith("cf-") || nome.startsWith("x-forwarded-") || nome === "x-real-ip"

export function repasse(prefixo) {
  const funcao = FUNCOES[prefixo]
  return async ({ request }) => {
    const url = new URL(request.url)
    const destino = funcao + url.pathname.slice(prefixo.length) + url.search
    const headers = new Headers()
    for (const [nome, valor] of request.headers) if (!naoRepassar(nome)) headers.set(nome, valor)
    // A função anuncia este endereço no 401 e no metadado, para a IA continuar falando por aqui.
    headers.set("x-mano-endereco-publico", `https://manobrotherhood.com${prefixo}`)
    // O pedido da IA é um JSON pequeno: lido inteiro, vale igual no Cloudflare e no Node dos testes.
    const corpo = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer()
    const resposta = await fetch(destino, { method: request.method, headers, body: corpo, redirect: "manual" })
    return new Response(resposta.body, resposta)
  }
}
