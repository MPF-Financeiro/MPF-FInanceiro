import { db } from "@/lib/db";
import { inicioDoMes } from "@/lib/mes";

/**
 * Mês fechado trava. Qualquer conta com fechamento concluído naquela
 * competência basta para travar, porque o fechamento é da empresa, não de
 * uma conta só: o que se quer é que o relatório daquele mês não mude depois
 * de a cliente ter olhado. Correção vira estorno no mês aberto.
 */
export async function competenciaFechada(competencia: Date): Promise<boolean> {
  const fechamento = await db.fechamentoMensal.findFirst({
    where: { competencia: inicioDoMes(competencia), fechadoEm: { not: null } },
    select: { id: true },
  });
  return Boolean(fechamento);
}

export class MesFechado extends Error {
  constructor(competencia: Date) {
    const mes = `${String(competencia.getUTCMonth() + 1).padStart(2, "0")}/${competencia.getUTCFullYear()}`;
    super(
      `A competência ${mes} está fechada. Para corrigir, lance um estorno no mês aberto em vez de mexer no mês fechado.`
    );
    this.name = "MesFechado";
  }
}

export async function exigirMesAberto(competencia: Date): Promise<void> {
  if (await competenciaFechada(competencia)) throw new MesFechado(competencia);
}
