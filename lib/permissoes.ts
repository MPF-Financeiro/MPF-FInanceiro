import { PapelUsuario } from "@prisma/client";
import { auth } from "@/lib/auth";

export type Sessao = {
  id: string;
  nome: string;
  papel: PapelUsuario;
};

/**
 * Papel é checado no servidor, em toda ação que escreve. Esconder botão no
 * cliente é cortesia; o que protege é isto.
 */
export async function sessaoAtual(): Promise<Sessao | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  return {
    id: s.user.id,
    nome: s.user.name ?? "",
    papel: (s.user.papel as PapelUsuario) ?? PapelUsuario.LEITURA,
  };
}

export class SemPermissao extends Error {
  constructor(mensagem = "Seu acesso não permite esta ação.") {
    super(mensagem);
    this.name = "SemPermissao";
  }
}

export async function exigir(papeis: PapelUsuario[]): Promise<Sessao> {
  const sessao = await sessaoAtual();
  if (!sessao) throw new SemPermissao("Entre de novo para continuar.");
  if (!papeis.includes(sessao.papel)) throw new SemPermissao();
  return sessao;
}

/** Lança e dá baixa no Financeiro. */
export const PAPEIS_FINANCEIRO: PapelUsuario[] = [PapelUsuario.ADMIN, PapelUsuario.FINANCEIRO];
/** Mexe no RH: colaboradores, folha, férias, exames. */
export const PAPEIS_RH: PapelUsuario[] = [PapelUsuario.ADMIN, PapelUsuario.RH];
/** Fecha o mês e mexe em taxas e cadastros estruturais. */
export const PAPEIS_ADMIN: PapelUsuario[] = [PapelUsuario.ADMIN];

export function podeLancar(papel: PapelUsuario): boolean {
  return PAPEIS_FINANCEIRO.includes(papel);
}

export function podeRH(papel: PapelUsuario): boolean {
  return PAPEIS_RH.includes(papel);
}

export function podeAdministrar(papel: PapelUsuario): boolean {
  return papel === PapelUsuario.ADMIN;
}

/** Salário, pró-labore e rescisão só para quem tem de ver. */
export function podeVerRemuneracao(papel: PapelUsuario): boolean {
  return papel === PapelUsuario.ADMIN || papel === PapelUsuario.RH;
}

export const ROTULO_PAPEL: Record<PapelUsuario, string> = {
  ADMIN: "Administrador",
  FINANCEIRO: "Financeiro",
  RH: "RH",
  LEITURA: "Só leitura",
};
