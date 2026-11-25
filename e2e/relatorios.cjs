const { chromium } = require("playwright");
const BASE = 'http://localhost:3100/financeiro';
const ok=[],falhas=[];
const checa=(c,m)=>(c?ok:falhas).push(m);

async function entrar(b, email) {
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  await p.goto(`${BASE}/login`);
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="password"]', 'financeiro123');
  await p.click('button:has-text("Entrar")');
  await p.waitForURL(/financeiro\/?$/, { timeout: 15000 }).catch(() => falhas.push(`login falhou para ${email}`));
  return p;
}

const telas = [
  ['/relatorios/fluxo-de-caixa', 'Fluxo de caixa'],
  ['/relatorios/gastos-fixos', 'Gastos fixos'],
  ['/relatorios/margem', 'Margem de contribuição por BU'],
  ['/relatorios/resumo', 'Resumo da operação'],
  ['/relatorios/resultado', 'Resultado operacional'],
  ['/relatorios/demonstracoes', 'Demonstrações financeiras'],
];

(async () => {
  const b = await chromium.launch();
  const admin = await entrar(b, 'admin@sampsdigital.com');
  for (const [url, titulo] of telas) {
    await admin.goto(BASE + url, { waitUntil: 'domcontentloaded' });
    checa((await admin.locator('h1').first().textContent())?.includes(titulo), `${titulo}: abre`);
    // Toda checagem da especificação escrita na tela tem de fechar.
    checa((await admin.getByText('Não fecha:').count()) === 0, `${titulo}: as conferências fecham`);
  }
  for (const mes of ['2026-06', '2027-01']) {
    await admin.goto(`${BASE}/relatorios/fluxo-de-caixa?mes=${mes}`, { waitUntil: 'domcontentloaded' });
    checa((await admin.getByText('Conferido:').count()) > 0, `fluxo de ${mes}: confere mesmo em mês vazio`);
  }
  await admin.goto(`${BASE}/relatorios/fluxo-de-caixa`, { waitUntil: 'domcontentloaded' });
  await admin.locator('summary:has-text("Financiamento")').click();
  const link = admin.locator('details[open] a').first();
  checa((await link.count()) > 0, 'o fluxo abre até o lançamento de origem');
  if (await link.count()) {
    await link.click();
    await admin.waitForURL(/\/(pagar|receber)\/[a-z0-9]+$/, { timeout: 10000 }).catch(() => {});
    checa(/\/(pagar|receber)\//.test(admin.url()), 'o link leva ao título');
    checa((await admin.getByText('Classificação para os relatórios').count()) > 0, 'o título mostra a classificação');
  }

  const rh = await entrar(b, 'rh@sampsdigital.com');
  await rh.goto(`${BASE}/relatorios/resultado`, { waitUntil: 'domcontentloaded' });
  checa(/financeiro\/?$/.test(rh.url()), 'o RH é devolvido dos relatórios');
  const menuRh = await rh.locator('nav[aria-label="Seções"] a').allTextContents();
  checa(!menuRh.includes('Fluxo de caixa'), 'o RH não vê os relatórios no menu');

  await b.close();
  console.log(`PASSOU (${ok.length}):`); ok.forEach((m) => console.log('  ok ', m));
  if (falhas.length) { console.log(`FALHOU (${falhas.length}):`); falhas.forEach((m) => console.log('  xx ', m)); process.exit(1); }
})();
