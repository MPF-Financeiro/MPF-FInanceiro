/**
 * A trava de duplicidade conferida no banco, que é onde ela vale: o mesmo
 * token gravado duas vezes tem de virar JaLancado, não um segundo lançamento.
 * Roda contra o banco de desenvolvimento, como o resto dos testes de ponta a
 * ponta.
 */
import { PrismaClient } from "@prisma/client";
import { JaLancado, registrarToken } from "../lib/idempotencia";

const db = new PrismaClient();
const ok: string[] = [];
const falhas: string[] = [];
const checa = (cond: boolean, msg: string) => (cond ? ok : falhas).push(msg);

async function main() {
  const token = `teste-${Date.now()}`;
  await registrarToken(db, token, "teste");
  checa(true, "o primeiro uso do token passa");

  let barrou = false;
  try {
    await registrarToken(db, token, "teste");
  } catch (e) {
    barrou = e instanceof JaLancado;
  }
  checa(barrou, "o segundo uso do mesmo token é recusado com JaLancado");

  // Sem token, ou com token estranho, a ação não pode travar o trabalho.
  await registrarToken(db, undefined, "teste");
  await registrarToken(db, "curto", "teste");
  checa(true, "sem token, e com token malformado, a ação segue");

  await db.idempotencia.deleteMany({ where: { acao: "teste" } });
}

main()
  .catch((e) => falhas.push(String(e)))
  .finally(async () => {
    await db.$disconnect();
    console.log(`PASSOU (${ok.length}):`);
    ok.forEach((o) => console.log("  ok  " + o));
    if (falhas.length) {
      console.log(`\nFALHOU (${falhas.length}):`);
      falhas.forEach((f) => console.log("  xx  " + f));
      process.exitCode = 1;
    }
  });
