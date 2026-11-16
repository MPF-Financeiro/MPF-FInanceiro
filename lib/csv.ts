/**
 * CSV para abrir no Excel brasileiro: ponto e vírgula como separador, vírgula
 * decimal e BOM no começo, senão o acento aparece quebrado.
 */
export function montarCSV(cabecalho: string[], linhas: Array<Array<string | number | null>>): string {
  const celula = (v: string | number | null) => {
    if (v === null || v === undefined) return "";
    const texto = typeof v === "number" ? String(v).replace(".", ",") : v;
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const corpo = [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  return `﻿${corpo}\r\n`;
}

/** Centavos no formato que a planilha entende como número. */
export function reaisCSV(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function dataCSV(d: Date | null | undefined): string {
  if (!d) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}
