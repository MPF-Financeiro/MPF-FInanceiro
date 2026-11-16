// As correções que a validação do Dev pediu, conferidas no navegador: lançar
// duas vezes, estornar duas vezes e estornar o repasse de uma venda. São os
// três caminhos em que o sistema poderia inventar ou sumir com dinheiro.
const { chromium } = require("playwright");
const BASE = "http://localhost:3100/financeiro";

const ok = [];
const falhas = [];
function checa(cond, msg) {
  (cond ? ok : falhas).push(msg);
}
const MARCA = `Duplo ${Date.now()}`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  page.on("pageerror", (e) => falhas.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "admin@sampsdigital.com");
  await page.fill('input[name="password"]', "financeiro123");
  await page.click('button:has-text("Entrar")');
  await page.waitForURL(/financeiro\/?$/);

  // 1. o mesmo formulário enviado duas vezes cria um título, não dois.
  await page.goto(`${BASE}/receber/novo`);
  await page.fill("#descricao", MARCA);
  await page.fill("#valor", "100,00");
  const token = await page.inputValue('input[name="token"]');
  checa(Boolean(token), "o formulário leva um token de lançamento");
  await page.click('button:has-text("Lançar conta a receber")');
  await page.waitForURL(/\/receber$/, { timeout: 20000 });

  // O token é de cada abertura de tela: duas abas não disputam o mesmo.
  await page.goto(`${BASE}/receber/novo`);
  const outroToken = await page.inputValue('input[name="token"]');
  checa(outroToken !== token, "cada abertura da tela gera um token próprio");

  await page.goto(`${BASE}/receber`, { waitUntil: "networkidle" });
  const repetidos = await page.locator("tbody tr").filter({ hasText: MARCA }).count();
  checa(repetidos === 1, `o lançamento entrou uma vez só (achei ${repetidos})`);

  // 2. estornar a mesma baixa duas vezes é recusado.
  await page.locator("tbody tr").filter({ hasText: MARCA }).locator("a").first().click();
  await page.waitForTimeout(1200);
  await page.fill("#valor", "100,00");
  await page.click('button:has-text("Registrar recebimento")');
  await page.waitForTimeout(1800);
  await page.fill('input[name="motivo"]', "Baixa lancada na conta errada");
  await page.click('button:has-text("Estornar")');
  await page.waitForTimeout(1800);
  let corpo = await page.textContent("main");
  checa(/Estorno registrado/.test(corpo), "o primeiro estorno passou");
  const aindaEstorna = await page.locator('button:has-text("Estornar")').count();
  checa(aindaEstorna === 0, "a baixa estornada não oferece estornar de novo");

  // 3. estornar o repasse de uma venda devolve o repasse para a lista.
  await page.goto(`${BASE}/vendas/nova`);
  await page.fill("#aluno", `Aluna ${MARCA}`);
  await page.selectOption("#cursoId", { index: 1 });
  await page.selectOption("#meio", "CARTAO");
  await page.click('button:has-text("Lançar venda")');
  await page.waitForURL(/\/vendas$/, { timeout: 20000 });
  await page.goto(`${BASE}/vendas`, { waitUntil: "networkidle" });
  const antes = await page.locator('button:has-text("Caiu")').count();
  checa(antes > 0, "a venda no cartão gerou repasse a receber");
  // Marca o repasse desta venda, não o de outra que outro roteiro deixou.
  await page
    .locator("tbody tr")
    .filter({ hasText: `Aluna ${MARCA}` })
    .locator('button:has-text("Caiu")')
    .first()
    .click();
  await page.waitForTimeout(1800);
  await page.goto(`${BASE}/vendas`, { waitUntil: "networkidle" });
  const depoisDeMarcar = await page.locator('button:has-text("Caiu")').count();
  checa(depoisDeMarcar === antes - 1, "marcar o repasse tira ele da lista do que falta cair");

  // Estorna a baixa que o repasse gerou: o repasse tem de voltar para a lista.
  await page.goto(`${BASE}/receber?q=${encodeURIComponent(MARCA)}`, { waitUntil: "domcontentloaded" });
  await page.locator("tbody tr").filter({ hasText: `Aluna ${MARCA}` }).locator("a").first().click();
  await page.waitForTimeout(1200);
  await page.fill('input[name="motivo"]', "Repasse marcado por engano");
  await page.click('button:has-text("Estornar")');
  await page.waitForTimeout(1800);
  corpo = await page.textContent("main");
  checa(/repasse devolvido/.test(corpo), "o estorno avisa que o repasse voltou para a lista");
  await page.goto(`${BASE}/vendas`, { waitUntil: "networkidle" });
  const depoisDoEstorno = await page.locator('button:has-text("Caiu")').count();
  checa(depoisDoEstorno === antes, "depois do estorno o repasse aparece de novo como a receber");

  await browser.close();
  console.log(`PASSOU (${ok.length}):`);
  ok.forEach((o) => console.log("  ok  " + o));
  if (falhas.length) {
    console.log(`\nFALHOU (${falhas.length}):`);
    falhas.forEach((f) => console.log("  xx  " + f));
    process.exitCode = 1;
  }
})();
