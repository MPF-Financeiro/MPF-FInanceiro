/**
 * Competência é sempre o primeiro dia do mês em UTC. Guardar o dia 1 em UTC
 * evita o clássico "lançou em 01/12 e caiu em novembro" de quem salva a data
 * local do navegador.
 */
export function inicioDoMes(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function fimDoMes(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

export function mesSeguinte(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

export function mesAnterior(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
}

/** "2026-11" → 01/11/2026 em UTC. Aceita também "2026-11-07". */
export function competenciaDe(texto: string): Date | null {
  const m = /^(\d{4})-(\d{2})/.exec(texto.trim());
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return new Date(Date.UTC(ano, mes - 1, 1));
}

/** O formato que o <input type="month"> espera. */
export function paraInputMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** O formato que o <input type="date"> espera. */
export function paraInputDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

export function hojeUTC(): Date {
  const agora = new Date();
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
}

/**
 * Soma meses mantendo o dia dentro do mês de destino. Sem o corte, 31/01 + 1
 * mês vira 03/03 ("31 de fevereiro" transborda), e uma parcela aparece no mês
 * errado do relatório. Com o corte, vira 28/02 — que é o que a cliente
 * escreveria à mão no boleto.
 */
export function somarMeses(d: Date, n: number): Date {
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() + n;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(d.getUTCDate(), ultimoDia)));
}
