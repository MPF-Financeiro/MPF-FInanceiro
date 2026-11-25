/**
 * Seed de PRODUÇÃO: deixa o banco novo pronto para o primeiro acesso.
 *
 * Diferente do `seed.ts` (o de teste), este nunca apaga nada e não cria
 * dado fictício. Só cria o que falta, e pode rodar quantas vezes for preciso:
 *
 *   1. o seu usuário ADMIN (rodar de novo troca a senha);
 *   2. a empresa, se EMPRESA_CNPJ for informado (sem ela não se lança título);
 *   3. as unidades de negócio (BUs) dos relatórios.
 *
 * Conta bancária e saldo inicial ficam para a tela Cadastros, porque dependem
 * do extrato do banco. As taxas do site usam o padrão de lib/taxas.ts até
 * alguém cadastrar outras em Vendas.
 *
 *   NOME="Seu Nome" EMAIL=voce@sampsdigital.com SENHA='...' \
 *   EMPRESA_NOME="Samps Digital" EMPRESA_CNPJ=00000000000100 \
 *     npm run db:seed:producao
 *
 * UNIDADES troca a lista de BUs (separadas por vírgula). A senha nunca é
 * impressa.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { ErroDeEntrada, obrigatoria, rodar, salvarUsuario, variavel } from "./usuario";

const db = new PrismaClient();

/** Provisórias até a diretoria mandar a lista oficial. */
const UNIDADES_PADRAO = ["Agência", "Cursos do Giovanni"];

rodar(db, async () => {
  // Valida tudo antes de escrever qualquer coisa.
  const admin = {
    nome: obrigatoria("NOME"),
    email: obrigatoria("EMAIL"),
    senha: obrigatoria("SENHA"),
    papel: "ADMIN",
  };
  const cnpj = variavel("EMPRESA_CNPJ")?.replace(/\D/g, "");
  if (cnpj !== undefined && cnpj.length !== 14) {
    throw new ErroDeEntrada("EMPRESA_CNPJ precisa ter 14 dígitos.");
  }
  const nomeEmpresa = variavel("EMPRESA_NOME") ?? "Samps Digital";
  const unidades = (variavel("UNIDADES")?.split(",") ?? UNIDADES_PADRAO)
    .map((u) => u.trim())
    .filter(Boolean);

  try {
    await db.usuario.count();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      throw new ErroDeEntrada("As tabelas ainda não existem. Rode `npm run db:push` antes.");
    }
    throw e;
  }

  const usuario = await salvarUsuario(db, admin);
  console.log(`Usuário: ${usuario.email} como ${usuario.papel}.`);

  if (cnpj) {
    const existia = await db.empresa.findUnique({ where: { cnpj } });
    const empresa = await db.empresa.upsert({
      where: { cnpj },
      update: {},
      create: { nome: nomeEmpresa, cnpj },
    });
    console.log(`Empresa: ${empresa.nome} (${existia ? "já existia" : "criada"}).`);
  } else if ((await db.empresa.count()) === 0) {
    console.log("Empresa: nenhuma. Informe EMPRESA_CNPJ ou cadastre em Cadastros antes de lançar.");
  }

  for (const nome of unidades) {
    const existia = await db.unidadeNegocio.findUnique({ where: { nome } });
    await db.unidadeNegocio.upsert({ where: { nome }, update: {}, create: { nome } });
    console.log(`BU: ${nome} (${existia ? "já existia" : "criada"}).`);
  }

  console.log("Pronto. Falta, na tela Cadastros: conta bancária e saldo inicial.");
});
