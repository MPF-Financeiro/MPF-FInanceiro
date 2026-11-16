const { chromium } = require("playwright");
const BASE = 'http://localhost:3100/financeiro';
const ok=[],falhas=[];
const checa=(c,m)=>(c?ok:falhas).push(m);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1440,height:950} });
  await p.goto(`${BASE}/login`);
  await p.fill('input[name="email"]','admin@sampsdigital.com');
  await p.fill('input[name="password"]','financeiro123');
  await p.click('button:has-text("Entrar")'); await p.waitForTimeout(1200);

  // importar extrato e conciliar
  await p.goto(`${BASE}/banco`, { waitUntil: 'networkidle' });
  let corpo = await p.textContent('main');
  checa(/sem conciliar/.test(corpo), 'a tela de banco mostra quantos movimentos faltam conciliar');
  const sugeridos = await p.locator('text=sugerido').count();
  checa(sugeridos > 0, `a conciliação sugeriu baixa para ${sugeridos} movimentos`);
  await p.locator('form:has(button:has-text("Conciliar"))').first().locator('button:has-text("Conciliar")').click();
  await p.waitForTimeout(1500);
  corpo = await p.textContent('main');
  checa(/Movimento conciliado/.test(corpo), 'conciliou o movimento sugerido');

  // Com o identificador do banco repetido, a segunda linha é repetição de
  // verdade e é descartada; as duas linhas iguais sem identificador do bloco
  // seguinte são dois lançamentos, e as duas têm de entrar.
  const marca = Date.now();
  await p.fill('#ext-texto', `05/11/2026;TESTE IMPORTACAO ${marca};123,45;E${marca}\n05/11/2026;TESTE IMPORTACAO ${marca};123,45;E${marca}\nlinha ruim`);
  await p.click('button:has-text("Importar")');
  await p.waitForTimeout(1500);
  corpo = await p.textContent('main');
  checa(/1 movimentos importados/.test(corpo), 'importação descarta a linha com identificador repetido do banco');
  checa(/não foram lidas/.test(corpo), 'importação avisou da linha que não deu para ler');

  await p.fill('#ext-texto', `06/11/2026;PIX GEMEO ${marca};77,00\n06/11/2026;PIX GEMEO ${marca};77,00`);
  await p.click('button:has-text("Importar")');
  await p.waitForTimeout(1500);
  corpo = await p.textContent('main');
  checa(
    /2 movimentos importados/.test(corpo),
    'dois lançamentos idênticos sem identificador do banco entram os dois'
  );

  // fechar o mês e tentar lançar depois
  await p.goto(`${BASE}/banco?competencia=2026-11`, { waitUntil: 'networkidle' });
  await p.fill('#fec-inicial', '1.000,00');
  await p.fill('#fec-extrato', '1.000,00');
  await p.click('button:has-text("Fechar o mês")');
  await p.waitForTimeout(2000);
  corpo = await p.textContent('main');
  checa(/Mês fechado/.test(corpo), 'mês fechado');
  checa(
    /diferença de|bate com o calculado/.test(corpo),
    'a tela compara o saldo calculado com o saldo do extrato'
  );

  await p.goto(`${BASE}/receber/novo`, { waitUntil: 'networkidle' });
  await p.fill('#descricao', `Lancamento em mes fechado ${Date.now()}`);
  await p.fill('#valor', '10,00');
  await p.fill('#competencia', '2026-11');
  await p.click('button:has-text("Lançar conta a receber")');
  await p.waitForTimeout(2000);
  corpo = await p.textContent('main');
  checa(/está fechada/.test(corpo), 'lançamento em competência fechada é recusado');

  // reabrir
  await p.goto(`${BASE}/banco?competencia=2026-11`, { waitUntil: 'networkidle' });
  await p.fill('#reabrir-motivo', 'Teste automatico de reabertura');
  await p.click('button:has-text("Reabrir o mês")');
  await p.waitForTimeout(1500);
  await p.goto(`${BASE}/banco?competencia=2026-11`, { waitUntil: 'networkidle' });
  corpo = await p.textContent('main');
  checa(!/Mês fechado/.test(corpo), 'mês reaberto: o carimbo saiu');
  checa(/Fechar o mês/.test(corpo), 'mês reaberto: o botão de fechar voltou');

  // exportação
  const r = await p.request.get(`${BASE}/api/exportar/receber`);
  const csv = await r.text();
  checa(r.status() === 200 && csv.startsWith('﻿'), 'exportação de contas a receber vem com BOM para o Excel');
  checa(/Competência;Vencimento/.test(csv), 'o CSV tem o cabeçalho em português');
  checa(!/cpf/i.test(csv), 'o CSV não leva CPF');

  await b.close();
  console.log(`PASSOU (${ok.length}):`); ok.forEach(o=>console.log('  ok  '+o));
  if (falhas.length) { console.log(`\nFALHOU (${falhas.length}):`); falhas.forEach(f=>console.log('  xx  '+f)); process.exitCode=1; }
})();
