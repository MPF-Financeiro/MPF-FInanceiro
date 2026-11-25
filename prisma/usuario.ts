/**
 * Criar ou atualizar um usuário, com as mesmas regras em todo script de
 * produção (`criar-usuario.ts` e `seed-producao.ts`).
 */
import { PapelUsuario, type PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const PAPEIS = Object.values(PapelUsuario);

export class ErroDeEntrada extends Error {}

export function variavel(nome: string): string | undefined {
  const valor = process.env[nome]?.trim();
  return valor ? valor : undefined;
}

export function obrigatoria(nome: string): string {
  const valor = variavel(nome);
  if (!valor) throw new ErroDeEntrada(`Falta a variável ${nome}.`);
  return valor;
}

export type DadosUsuario = { nome: string; email: string; senha: string; papel: string };

export function validarUsuario(d: DadosUsuario) {
  const email = d.email.toLowerCase();
  const papel = d.papel as PapelUsuario;
  if (!PAPEIS.includes(papel)) {
    throw new ErroDeEntrada(`PAPEL inválido: ${d.papel}. Use um de: ${PAPEIS.join(", ")}.`);
  }
  if (d.senha.length < 12) throw new ErroDeEntrada("A senha precisa de pelo menos 12 caracteres.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErroDeEntrada(`E-mail inválido: ${email}`);
  return { nome: d.nome, email, senha: d.senha, papel };
}

/** Upsert: rodar de novo com o mesmo e-mail troca a senha e o papel. */
export async function salvarUsuario(db: PrismaClient, d: DadosUsuario) {
  const v = validarUsuario(d);
  const senhaHash = await bcrypt.hash(v.senha, 12);
  return db.usuario.upsert({
    where: { email: v.email },
    update: { nome: v.nome, senhaHash, papel: v.papel, ativo: true },
    create: { nome: v.nome, email: v.email, senhaHash, papel: v.papel, ativo: true },
  });
}

export async function rodar(db: PrismaClient, main: () => Promise<void>) {
  try {
    await main();
  } catch (e) {
    console.error(e instanceof ErroDeEntrada ? e.message : e);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
