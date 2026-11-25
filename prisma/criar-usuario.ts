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
import { PrismaClient } from "@prisma/client";
import { obrigatoria, rodar, salvarUsuario, variavel } from "./usuario";

const db = new PrismaClient();

rodar(db, async () => {
  const usuario = await salvarUsuario(db, {
    nome: obrigatoria("NOME"),
    email: obrigatoria("EMAIL"),
    senha: obrigatoria("SENHA"),
    papel: variavel("PAPEL") ?? "ADMIN",
  });
  console.log(`Pronto: ${usuario.email} como ${usuario.papel}.`);
});
