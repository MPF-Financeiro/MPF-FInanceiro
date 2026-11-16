const { chromium } = require("playwright");
const BASE = 'http://localhost:3100/financeiro';

const ok = [];
const falhas = [];
function checa(cond, msg) { (cond ? ok : falhas).push(msg); }
// Nome e competência únicos por rodada, para o roteiro poder repetir.
const MARCA = `Teste parcelado ${Date.now()}`;
const COMPETENCIA_FOLHA = `20${30 + (new Date().getUTCDate() % 9)}-${String((Date.now() % 12) + 1).padStart(2, '0')}`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  page.on('pageerror', (e) => falhas.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', 'admin@sampsdigital.com');
  await page.fill('input[name="password"]', 'financeiro123');
  await page.click('button:has-text("Entrar")');
  await page.waitForURL(/financeiro\/?$/);

  // 1. lançar conta a receber em 3 parcelas
  await page.goto(`${BASE}/receber/novo`);
  await page.fill('#descricao', MARCA);
  await page.fill('#valor', '1.000,01');
  await page.fill('#parcelas', '3');
  const previsao = await page.textContent('body');
  checa(/3 títulos de R\$\s*333,33/.test(previsao), 'previsão de parcelas mostra 3 x 333,33');
  checa(/primeiro de R\$\s*333,35/.test(previsao), 'previsão põe o centavo que sobra na primeira parcela');
  await page.click('button:has-text("Lançar conta a receber")');
  await page.waitForURL(/\/receber$/, { timeout: 20000 });
  await page.goto(`${BASE}/receber`, { waitUntil: 'networkidle' });
  const lista = await page.textContent('body');
  const linhasDoTeste = await page
    .locator('tbody tr')
    .filter({ hasText: MARCA })
    .count();
  checa(linhasDoTeste === 3, `as 3 parcelas apareceram na lista (achei ${linhasDoTeste})`);
  checa(/\(1\/3\)/.test(lista) && /\(3\/3\)/.test(lista), 'parcelas numeradas');

  // 2. abrir a primeira e dar baixa parcial
  const linha = page.locator('tbody tr').filter({ hasText: `${MARCA} (1/3)` }).first();
  await linha.getByRole('link', { name: 'Abrir' }).click();
  await page.waitForURL(/\/receber\/[a-z0-9]+$/);
  await page.fill('#valor', '100,00');
  await page.click('button:has-text("Registrar recebimento")');
  await page.waitForTimeout(1200);
  let corpo = await page.textContent('body');
  checa(/Baixa registrada/.test(corpo), 'baixa registrada com aviso de sucesso');
  checa(/Parcial/.test(corpo), 'status virou Parcial sozinho');
  checa(/R\$\s*233,35/.test(corpo), 'pendente passou a 233,35');

  // 3. valor acima do pendente é recusado
  await page.fill('#valor', '9.999,00');
  await page.click('button:has-text("Registrar recebimento")');
  await page.waitForTimeout(1200);
  corpo = await page.textContent('body');
  checa(/maior que o pendente/.test(corpo), 'baixa acima do pendente é recusada com explicação');

  // 4. estorno
  await page.fill('input[name="motivo"]', 'Teste de estorno automatico');
  await page.click('button:has-text("Estornar")');
  await page.waitForTimeout(1200);
  corpo = await page.textContent('body');
  checa(/Estorno registrado no histórico/.test(corpo), 'estorno registrado');
  checa(/Estorno de/.test(corpo), 'estorno aparece no histórico como linha negativa');
  checa(/Em aberto/.test(corpo), 'título voltou a Em aberto depois do estorno');

  // 5. venda do site com cupom
  await page.goto(`${BASE}/vendas/nova`);
  await page.fill('#aluno', `Aluno ${Date.now()}`);
  await page.selectOption('#cursoId', { index: 1 });
  await page.waitForTimeout(300);
  corpo = await page.textContent('body');
  checa(/Líquido/.test(corpo) && /Nota fiscal, 10%/.test(corpo), 'cascata ao vivo mostra nota de 10%');
  await page.click('button:has-text("Lançar venda")');
  await page.waitForURL(/\/vendas$/, { timeout: 20000 });
  await page.goto(`${BASE}/vendas`, { waitUntil: 'networkidle' });
  corpo = await page.textContent('body');
  checa(/Aluno 1\d{12}/.test(corpo), 'venda apareceu na lista');

  // 6. folha de uma competência sem folha
  const COMP = COMPETENCIA_FOLHA;
  await page.goto(`${BASE}/rh/folha?competencia=${COMP}`, { waitUntil: 'networkidle' });
  corpo = await page.textContent('body');
  if (/Abrir folha/.test(corpo)) {
    await page.click('button:has-text("Abrir folha")');
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/rh/folha?competencia=${COMP}`, { waitUntil: 'networkidle' });
    corpo = await page.textContent('body');
    checa(/Líquido a pagar/.test(corpo), 'folha aberta com os colaboradores ativos');

    const desabilitado = await page
      .locator('button:has-text("Mandar para o Financeiro")')
      .isDisabled();
    checa(desabilitado, 'folha aberta não pode ir ao Financeiro: o botão fica desabilitado');

    await page.click('button:has-text("Fechar folha")');
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/rh/folha?competencia=${COMP}`, { waitUntil: 'networkidle' });
    corpo = await page.textContent('body');
    checa(/Folha fechada/.test(corpo), 'folha fechada ganhou o carimbo');

    await page.click('button:has-text("Mandar para o Financeiro")');
    await page.waitForTimeout(2000);
    corpo = await page.textContent('body');
    checa(/t[íi]tulos criados/.test(corpo), 'folha gerou os títulos a pagar');

    await page.goto(`${BASE}/rh/folha?competencia=${COMP}`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Reenviar ao Financeiro")');
    await page.waitForTimeout(2000);
    corpo = await page.textContent('body');
    checa(/0 t[íi]tulos criados/.test(corpo), 'reenviar a folha não duplica título');
  } else {
    falhas.push(`a tela da folha não ofereceu abrir folha para ${COMP}: ${corpo.slice(0, 200)}`);
  }

  await browser.close();
  console.log(`PASSOU (${ok.length}):`);
  ok.forEach((o) => console.log('  ok  ' + o));
  if (falhas.length) {
    console.log(`\nFALHOU (${falhas.length}):`);
    falhas.forEach((f) => console.log('  xx  ' + f));
    process.exitCode = 1;
  }
})();
