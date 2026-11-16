import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type Cliente = PrismaClient | Prisma.TransactionClient;

/**
 * Cada formulário que cria dinheiro carrega um token próprio, gerado no
 * navegador quando a tela abre. A gravação registra o token primeiro: se ele
 * já existe, o lançamento é o mesmo de antes e a ação para.
 *
 * É isso que segura o clique duplo, o F5 na tela de confirmação e a internet
 * ruim que faz a pessoa mandar de novo — as três formas de nascer lançamento
 * duplicado que não dependem de a pessoa estar distraída.
 */
export class JaLancado extends Error {
  constructor() {
    super("Este lançamento já foi registrado. Atualize a tela para conferir.");
    this.name = "JaLancado";
  }
}

export async function registrarToken(
  cliente: Cliente,
  token: string | undefined,
  acao: string
): Promise<void> {
  // Sem token (formulário antigo em cache, por exemplo) a ação segue: é
  // melhor aceitar o lançamento do que recusar o trabalho de alguém.
  if (!token) return;
  if (!/^[\w-]{8,64}$/.test(token)) return;

  try {
    await cliente.idempotencia.create({ data: { id: token, acao } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new JaLancado();
    }
    throw e;
  }
}
