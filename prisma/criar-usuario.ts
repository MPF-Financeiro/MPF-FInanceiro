/**
 * Cria ou atualiza UM usuário do Financeiro, para o primeiro acesso em
 * produção. Existe porque o seed não serve para isso: ele apaga as tabelas e
 * cria contas com senha conhecida.
 *
 *   NOME="Nome da pessoa" EMAIL=pessoa@sampsdigital.com SENHA='...' PAPEL=ADMIN \
 *     npx tsx prisma/criar-usuario.ts
 *
 * Papéis: ADMIN, FINANCEIRO, RH, LEITURA.
 *
 * Rodar o comando com um espaço na frente deixa a senha fora do histórico do
 * shell na maioria das configurações. A senha nunca é impressa aqui.
 */
import { PapelUsuario, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const PAPEIS = Object.values(PapelUsuario);

function obrigatorio(nome: string): string {
  const valor = process.env[nome]?.trim();
  if (!valor) {
    console.error(`Falta a variável ${nome}.`);
    process.exit(1);
  }
  return valor;
}

async function main() {
  const nome = obrigatorio("NOME");
  const email = obrigatorio("EMAIL").toLowerCase();
  const senha = obrigatorio("SENHA");
  const papel = (process.env.PAPEL?.trim() || "ADMIN") as PapelUsuario;

  if (!PAPEIS.includes(papel)) {
    console.error(`PAPEL inválido: ${papel}. Use um de: ${PAPEIS.join(", ")}.`);
    process.exit(1);
  }
  if (senha.length < 12) {
    console.error("A senha precisa de pelo menos 12 caracteres.");
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(`E-mail inválido: ${email}`);
    process.exit(1);
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  // Upsert para o comando poder ser repetido: trocar a senha de alguém é
  // rodar de novo com a senha nova, sem mexer no banco à mão.
  const usuario = await db.usuario.upsert({
    where: { email },
    update: { nome, senhaHash, papel, ativo: true },
    create: { nome, email, senhaHash, papel, ativo: true },
  });

  console.log(`Pronto: ${usuario.email} como ${usuario.papel}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
