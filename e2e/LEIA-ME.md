# Testes de navegador

Quatro roteiros que abrem a aplicação de verdade e conferem o que o teste
unitário não alcança: o formulário envia, a baixa muda o status, o mês fechado
recusa lançamento, o papel do usuário barra o que tem de barrar.

- `navegacao.cjs` — login, volta para a tela pedida, redirecionamentos depois de lançar, sair.
- `fluxo.cjs` — lançar parcelado, dar baixa, recusa acima do pendente, estorno, venda do site, folha (abrir, fechar, enviar, reenviar sem duplicar).
- `fechar.cjs` — importar extrato, conciliar, fechar e reabrir o mês, exportação em CSV.
- `papeis.cjs` — o que cada papel vê e o que não vê.

## Como rodar

Precisa de um banco limpo com o seed, porque os roteiros conferem quantidades.

```bash
# 1. banco de teste
createdb financeiro        # ou outro banco só para teste
export DATABASE_URL="postgresql://.../financeiro"
export DIRECT_URL="$DATABASE_URL"
npm run db:push
npm run db:seed            # NUNCA em produção: o seed apaga tudo

# 2. aplicação construída, na porta 3100
npm run build
npx next start -p 3100     # precisa de AUTH_SECRET e, fora da Vercel, AUTH_TRUST_HOST=true

# 3. os roteiros
npm run test:e2e
```

Cada roteiro imprime o que passou e o que falhou, e sai com código 1 se algo
falhou. Entre um roteiro e outro, rode o seed de novo se quiser repetir do zero.

O Playwright não é dependência do projeto, para não pesar o build: instale uma
vez na máquina com `npm i -g playwright && npx playwright install chromium`.

O `fechar.cjs` é o único que precisa do seed recém-rodado: ele conta os
movimentos do extrato que ainda não foram conciliados.
