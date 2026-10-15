# manobrotherhood.com

Site do app MANO: página inicial, política de privacidade, termos de uso e exclusão de conta.

As páginas são geradas a partir de `shared/mano-legal.ts` do app (mesmo texto que aparece dentro do MANO) e publicadas pelo Cloudflare Pages.

## Atualizar as páginas
1. Edite o texto em `shared/mano-legal.ts`, no repositório do app (`ikmaciel/kao`).
2. Gere o site: `node ferramentas/gerar-site.mjs <caminho>/shared/mano-legal.ts . <caminho>/public/mano-icon-192.png`
3. Faça o commit aqui. O Cloudflare Pages publica sozinho.

## Páginas escritas à mão
- `comboio/entrar/`: página do link de convite do comboio. Abre o MANO (`mano://` ou `mano-testes://` quando há `&app=testes`) e, sem o app, orienta a instalar e tocar no link de novo. O gerador não mexe nela.
- `acompanhar/` (comboio) e `acompanhar/viagem/` (viagem solo e alerta de queda): acompanhamento ao vivo para quem está em casa. Leem o código depois do `#` e consultam as funções públicas do Supabase (`comboio-publico`, `viagem-publica`). Com `?ambiente=testes`, usam o HML.

## Fontes do mapa
`fontes/` são os glifos do mapa do app (Noto Sans, licença OFL), copiados da tag `fontes-v1` de `ikmaciel/mano-mapas` (MD5 conferido). Antes o app os buscava em `raw.githubusercontent.com`, que limita downloads; desde 15/10/2026 o app usa `https://manobrotherhood.com/fontes/{fontstack}/{range}.pbf`. Para mudar uma fonte, publicar como pasta nova (ex.: `fontes-v2/`) e trocar a URL no app, sem sobrescrever arquivos.
