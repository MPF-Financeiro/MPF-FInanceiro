const { chromium } = require("playwright");
const BASE = 'http://localhost:3100/financeiro';
const ok=[],falhas=[]; const checa=(c,m)=>(c?ok:falhas).push(m);
// Nome único por rodada: o roteiro pode rodar várias vezes no mesmo banco.
const MARCA = `Teste redirect ${Date.now()}`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  // 1. link direto para uma tela protegida: volta para lá depois do login
  await p.goto(`${BASE}/vendas`);
  await p.fill('input[name="email"]','admin@sampsdigital.com');
  await p.fill('input[name="password"]','financeiro123');
  await p.click('button:has-text("Entrar")');
  await p.waitForTimeout(2500);
  checa(/\/financeiro\/vendas$/.test(p.url()), `login volta para a tela pedida (${p.url()})`);
  checa((await p.locator('h1').allTextContents()).join().includes('Vendas'), 'a tela de vendas renderizou');

  // 2. redirect depois de lançar
  await p.goto(`${BASE}/receber/novo`);
  await p.fill('#descricao', MARCA);
  await p.fill('#valor','50,00');
  await p.click('button:has-text("Lançar conta a receber")');
  await p.waitForTimeout(2500);
  checa(/\/financeiro\/receber$/.test(p.url()), `depois de lançar vai para a lista (${p.url()})`);
  const h1 = (await p.locator('h1').allTextContents()).join();
  checa(h1.includes('Contas a receber'), `a lista renderizou (h1: ${h1})`);
  checa(
    (await p.locator('tbody tr').filter({ hasText: MARCA }).count()) === 1,
    'o título novo está na lista'
  );

  // 3. redirect depois de lançar venda
  await p.goto(`${BASE}/vendas/nova`);
  await p.fill('#aluno', `Aluno ${MARCA}`);
  await p.selectOption('#cursoId', { index: 1 });
  await p.click('button:has-text("Lançar venda")');
  await p.waitForTimeout(2500);
  checa(/\/financeiro\/vendas$/.test(p.url()), `depois da venda vai para vendas (${p.url()})`);
  checa((await p.locator('h1').allTextContents()).join().includes('Vendas'), 'a tela de vendas renderizou de novo');

  // 4. sair
  await p.click('button:has-text("Sair")');
  await p.waitForTimeout(2000);
  checa(/\/financeiro\/login/.test(p.url()), `sair leva ao login do Financeiro (${p.url()})`);

  await b.close();
  console.log(`PASSOU (${ok.length}):`); ok.forEach(o=>console.log('  ok  '+o));
  if (falhas.length) { console.log(`\nFALHOU (${falhas.length}):`); falhas.forEach(f=>console.log('  xx  '+f)); process.exitCode=1; }
})();
