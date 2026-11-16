import { parseCentavos } from "@/lib/validacao";

export type LinhaExtrato = {
  data: Date;
  descricao: string;
  /** Centavos; negativo é saída. */
  valor: number;
  /** Identificador do banco. Sem ele, um identificador derivado da linha. */
  fitid: string;
};

export type ResultadoExtrato = {
  linhas: LinhaExtrato[];
  erros: Array<{ linha: number; texto: string; motivo: string }>;
};

function parseData(texto: string): Date | null {
  const t = texto.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  m = /^(\d{2})[/.-](\d{2})[/.-](\d{4})/.exec(t);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  m = /^(\d{2})[/.-](\d{2})[/.-](\d{2})$/.exec(t);
  if (m) return new Date(Date.UTC(2000 + Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  return null;
}

/** Identificador estável quando o banco não manda um: a própria linha. */
function derivarFitid(data: Date, descricao: string, valor: number): string {
  const base = `${data.toISOString().slice(0, 10)}|${descricao.toLowerCase().replace(/\s+/g, " ").trim()}|${valor}`;
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) | 0;
  }
  return `d${(hash >>> 0).toString(36)}`;
}

/**
 * Lê o extrato colado da planilha ou do internet banking: data, descrição,
 * valor e, se houver, o identificador do banco. Aceita ponto e vírgula,
 * tabulação ou vírgula como separador, e data em dd/mm/aaaa ou aaaa-mm-dd.
 * Linha que não dá para ler não derruba a importação: volta na lista de erros
 * para a pessoa corrigir.
 */
export function lerExtrato(texto: string): ResultadoExtrato {
  const linhas: LinhaExtrato[] = [];
  const erros: ResultadoExtrato["erros"] = [];
  const vistos = new Set<string>();

  const cruas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const [i, crua] of cruas.entries()) {
    const separador = crua.includes("\t") ? "\t" : crua.includes(";") ? ";" : ",";
    const partes = crua.split(separador).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (partes.length < 3) {
      erros.push({ linha: i + 1, texto: crua, motivo: "A linha precisa de data, descrição e valor" });
      continue;
    }

    const data = parseData(partes[0]);
    if (!data) {
      // Cabeçalho da planilha cai aqui e é ignorado em silêncio.
      if (/data/i.test(partes[0])) continue;
      erros.push({ linha: i + 1, texto: crua, motivo: "Data não reconhecida" });
      continue;
    }

    const descricao = partes[1];
    const valor = parseCentavos(partes[2]);
    if (valor === null || valor === 0) {
      erros.push({ linha: i + 1, texto: crua, motivo: "Valor não reconhecido" });
      continue;
    }

    const fitid = partes[3] || derivarFitid(data, descricao, valor);
    if (vistos.has(fitid)) {
      erros.push({ linha: i + 1, texto: crua, motivo: "Linha repetida no arquivo" });
      continue;
    }
    vistos.add(fitid);
    linhas.push({ data, descricao, valor, fitid });
  }

  return { linhas, erros };
}

/**
 * Sugere a baixa que casa com o movimento: mesmo valor e data perto. Sugerir
 * é diferente de conciliar: quem confirma é a pessoa.
 */
export function sugerirBaixa<T extends { id: string; valor: number; data: Date }>(
  movimento: { valor: number; data: Date },
  baixas: T[],
  toleranciaDias = 3
): T | null {
  const alvo = Math.abs(movimento.valor);
  const candidatas = baixas
    .filter((b) => Math.abs(b.valor) === alvo)
    .map((b) => ({
      baixa: b,
      distancia: Math.abs(b.data.getTime() - movimento.data.getTime()) / (24 * 60 * 60 * 1000),
    }))
    .filter((c) => c.distancia <= toleranciaDias)
    .sort((a, b) => a.distancia - b.distancia);
  return candidatas[0]?.baixa ?? null;
}
