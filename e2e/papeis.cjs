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
  try {
    await p.waitForURL(/financeiro\/?$/, { timeout: 15000 });
  } catch {
    falhas.push(`login falhou para ${email}: ficou em ${p.url()} — ${(await p.textContent('body')).slice(0, 160)}`);
  }
  await p.waitForTimeout(300);
  return p;
}

(async () => {
  const b = await chromium.launch();

  const leitura = await entrar(b, 'leitura@sampsdigital.com');
  let menu = await leitura.locator('header nav a').allTextContents();
  checa(!menu.includes('RH'), 'só leitura não vê RH no menu');
  checa(!menu.includes('Cadastros'), 'só leitura não vê Cadastros no menu');
  checa(!menu.includes('Banco'), 'só leitura não vê Banco no menu');
  await leitura.goto(`${BASE}/receber`, { waitUntil: 'networkidle' });
  checa(
    !(await leitura.getByRole('link', { name: 'Lançar conta a receber' }).count()),
    'só leitura não vê o botão de lançar'
  );
  await leitura.goto(`${BASE}/receber/novo`, { waitUntil: 'networkidle' });
  checa(/\/receber$/.test(leitura.url()), 'só leitura é devolvida da tela de lançar');
  await leitura.goto(`${BASE}/rh`, { waitUntil: 'networkidle' });
  checa(/financeiro\/?$/.test(leitura.url()), 'só leitura é devolvida do RH');
  const exp = await leitura.request.get(`${BASE}/api/exportar/folha?competencia=2026-11`);
  checa(exp.status() === 403, 'só leitura não exporta a folha');

  const rh = await entrar(b, 'rh@sampsdigital.com');
  menu = await rh.locator('header nav a').allTextContents();
  checa(menu.includes('RH'), 'o RH vê o RH no menu');
  checa(!menu.includes('Cadastros'), 'o RH não vê os cadastros do Financeiro');
  await rh.goto(`${BASE}/cadastros`, { waitUntil: 'networkidle' });
  checa(/financeiro\/?$/.test(rh.url()), 'o RH é devolvido dos cadastros');
  await rh.goto(`${BASE}/rh`, { waitUntil: 'networkidle' });
  const corpoRh = await rh.textContent('main');
  checa(/Salário/.test(corpoRh), 'o RH vê a coluna de salário');

  const fin = await entrar(b, 'financeiro@sampsdigital.com');
  await fin.goto(`${BASE}/rh`, { waitUntil: 'networkidle' });
  checa(/financeiro\/?$/.test(fin.url()), 'o Financeiro não entra no RH');
  await fin.goto(`${BASE}/cursos`, { waitUntil: 'networkidle' });
  const corpoFin = await fin.textContent('main');
  checa(/Só o administrador muda as taxas/.test(corpoFin), 'o Financeiro não muda as taxas');

  await b.close();
  console.log(`PASSOU (${ok.length}):`); ok.forEach(o=>console.log('  ok  '+o));
  if (falhas.length) { console.log(`\nFALHOU (${falhas.length}):`); falhas.forEach(f=>console.log('  xx  '+f)); process.exitCode=1; }
})();
