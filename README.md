# manobrotherhood.com

Site do app MANO: página inicial, política de privacidade, termos de uso e exclusão de conta.

As páginas são geradas a partir de `shared/mano-legal.ts` do app (mesmo texto que aparece dentro do MANO) e publicadas pelo Cloudflare Pages.

## Atualizar as páginas
1. Edite o texto em `shared/mano-legal.ts`, no repositório do app (`ikmaciel/kao`).
2. Gere o site: `node ferramentas/gerar-site.mjs <caminho>/shared/mano-legal.ts . <caminho>/public/mano-icon-192.png`
3. Faça o commit aqui. O Cloudflare Pages publica sozinho.

## Páginas escritas à mão
- `comboio/entrar/`: página do link de convite do comboio. Abre o MANO (`mano://` ou `mano-testes://` quando há `&app=testes`) e, sem o app, orienta a instalar e tocar no link de novo. O gerador não mexe nela.
- `trajeto/abrir/`: link que a IA mostra depois do `salvar_rota` do MCP (desde 29/10/2026). Abre o trajeto no MANO (`mano://trajeto?id=` ou `mano-testes://` quando há `&app=testes`); no computador, pede para abrir no celular.
- `local/abrir/`: link do "Enviar" de um local no MANO (decisão 402, 31/10/2026). Coordenadas e nome ficam depois do `#` (`#lat=…&lng=…&nome=…`), não vão para o servidor e nada é lido do banco. Com o app, abre `mano://local?…` (ou `mano-testes://` quando há `?app=testes`); sem ele, mostra o ponto no mapa (o mesmo do acompanhar), "Abrir no app de mapa do celular" (`geo:`) e onde instalar.
- `acompanhar/` (comboio) e `acompanhar/viagem/` (viagem solo e alerta de queda): acompanhamento ao vivo para quem está em casa. Leem o código depois do `#` e consultam as funções públicas do Supabase (`comboio-publico`, `viagem-publica`). Com `?ambiente=testes`, usam o HML.

## Endereço do conector da IA (MCP)
`/mcp` e `/mcp-testes` (em `functions/`, Pages Functions) são o endereço que a pessoa cola na IA para ligar a conta MANO, desde 31/10/2026 (decisão 403 do app). O repasse leva o pedido, com o resto do caminho e a consulta, à função `mcp` do Supabase da produção ou do HML, e avisa por onde a IA chegou (`x-mano-endereco-publico`), para a função anunciar o mesmo endereço no 401 e no metadado. Não guarda nada. Quem conectou direto pelo `supabase.co` continua funcionando. Se o projeto do Supabase mudar, troque o endereço em `functions/_repasse.js`.

## Link para baixar o app
`/baixar` (em `_redirects`) é o link que o app põe em toda mensagem que manda para fora (WhatsApp, SMS, compartilhar), desde 23/10/2026. Hoje leva à página do MANO na Play (só funciona para quem já aceitou o convite de teste). Quando houver teste fechado com Grupo do Google, ou o app estiver publicado, troque o destino aqui: o app não precisa de atualização. Redirecionamento 302 de propósito, para o navegador não guardar o destino.

## Fontes do mapa
`fontes/` são os glifos do mapa do app (Noto Sans, licença OFL), copiados da tag `fontes-v1` de `ikmaciel/mano-mapas` (MD5 conferido). Antes o app os buscava em `raw.githubusercontent.com`, que limita downloads; desde 15/10/2026 o app usa `https://manobrotherhood.com/fontes/{fontstack}/{range}.pbf`. Para mudar uma fonte, publicar como pasta nova (ex.: `fontes-v2/`) e trocar a URL no app, sem sobrescrever arquivos.
