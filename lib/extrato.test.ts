import { describe, expect, it } from "vitest";
import { lerExtrato, sugerirBaixa } from "@/lib/extrato";
import { reais } from "@/lib/money";

describe("lerExtrato", () => {
  it("lê ponto e vírgula com data brasileira", () => {
    const r = lerExtrato("05/11/2026;PIX RECEBIDO ANA;1.250,00;E123");
    expect(r.erros).toEqual([]);
    expect(r.linhas[0]).toMatchObject({
      descricao: "PIX RECEBIDO ANA",
      valor: reais(1250),
      fitid: "E123",
    });
    expect(r.linhas[0].data.toISOString().slice(0, 10)).toBe("2026-11-05");
  });

  it("lê tabulação e data ISO, e entende saída negativa", () => {
    const r = lerExtrato("2026-11-07\tALUGUEL\t-2.000,00");
    expect(r.linhas[0].valor).toBe(-reais(2000));
  });

  it("ignora o cabeçalho da planilha", () => {
    const r = lerExtrato("Data;Descrição;Valor\n05/11/2026;TESTE;10,00");
    expect(r.linhas).toHaveLength(1);
    expect(r.erros).toEqual([]);
  });

  it("gera identificador estável quando o banco não manda um", () => {
    const a = lerExtrato("05/11/2026;TESTE;10,00").linhas[0].fitid;
    const b = lerExtrato("05/11/2026;TESTE;10,00").linhas[0].fitid;
    expect(a).toBe(b);
    const c = lerExtrato("05/11/2026;TESTE;10,01").linhas[0].fitid;
    expect(c).not.toBe(a);
  });

  it("recusa a linha repetida sem derrubar o resto", () => {
    const r = lerExtrato("05/11/2026;TESTE;10,00\n05/11/2026;TESTE;10,00\n06/11/2026;OUTRO;20,00");
    expect(r.linhas).toHaveLength(2);
    expect(r.erros[0].motivo).toContain("repetida");
  });

  it("junta os erros em vez de parar na primeira linha ruim", () => {
    const r = lerExtrato("xx;TESTE;10,00\n05/11/2026;TESTE;abc\n06/11/2026;BOM;5,00");
    expect(r.linhas).toHaveLength(1);
    expect(r.erros).toHaveLength(2);
  });
});

describe("sugerirBaixa", () => {
  const d = (dia: number) => new Date(Date.UTC(2026, 10, dia));

  it("casa pelo valor e pega a data mais próxima", () => {
    const baixas = [
      { id: "longe", valor: reais(100), data: d(1) },
      { id: "perto", valor: reais(100), data: d(5) },
    ];
    expect(sugerirBaixa({ valor: reais(100), data: d(6) }, baixas)?.id).toBe("perto");
  });

  it("casa saída do extrato com baixa positiva de conta a pagar", () => {
    const baixas = [{ id: "a", valor: reais(2000), data: d(7) }];
    expect(sugerirBaixa({ valor: -reais(2000), data: d(7) }, baixas)?.id).toBe("a");
  });

  it("não sugere nada fora da tolerância de dias", () => {
    const baixas = [{ id: "a", valor: reais(100), data: d(1) }];
    expect(sugerirBaixa({ valor: reais(100), data: d(20) }, baixas)).toBeNull();
  });

  it("não sugere nada com valor diferente", () => {
    const baixas = [{ id: "a", valor: reais(100), data: d(5) }];
    expect(sugerirBaixa({ valor: reais(101), data: d(5) }, baixas)).toBeNull();
  });
});
