import { describe, expect, it } from "vitest";
import { efeitoNoCaixa, lerExtrato, sugerirBaixa } from "@/lib/extrato";
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

  it("recusa a linha repetida quando o banco mandou o mesmo identificador", () => {
    const r = lerExtrato("05/11/2026;TESTE;10,00;E1\n05/11/2026;TESTE;10,00;E1\n06/11/2026;OUTRO;20,00;E2");
    expect(r.linhas).toHaveLength(2);
    expect(r.erros[0].motivo).toContain("repetida");
  });

  it("mantém dois lançamentos idênticos sem identificador do banco", () => {
    // Dois Pix do mesmo valor no mesmo dia acontecem; descartar o segundo
    // sumiria com dinheiro que entrou.
    const r = lerExtrato("05/11/2026;PIX ANA;10,00\n05/11/2026;PIX ANA;10,00");
    expect(r.linhas).toHaveLength(2);
    expect(r.erros).toEqual([]);
    expect(r.linhas[0].fitid).not.toBe(r.linhas[1].fitid);
  });

  it("junta os erros em vez de parar na primeira linha ruim", () => {
    const r = lerExtrato("xx;TESTE;10,00\n05/11/2026;TESTE;abc\n06/11/2026;BOM;5,00");
    expect(r.linhas).toHaveLength(1);
    expect(r.erros).toHaveLength(2);
  });
});

describe("efeitoNoCaixa", () => {
  it("receber entra e pagar sai", () => {
    expect(efeitoNoCaixa(reais(100), "RECEBER")).toBe(reais(100));
    expect(efeitoNoCaixa(reais(100), "PAGAR")).toBe(-reais(100));
  });

  it("estorno inverte sozinho", () => {
    expect(efeitoNoCaixa(-reais(100), "RECEBER")).toBe(-reais(100));
    expect(efeitoNoCaixa(-reais(100), "PAGAR")).toBe(reais(100));
  });
});

describe("sugerirBaixa", () => {
  const d = (dia: number) => new Date(Date.UTC(2026, 10, dia));
  const receber = (id: string, valor: number, dia: number) => ({
    id,
    efeito: efeitoNoCaixa(valor, "RECEBER" as const),
    data: d(dia),
  });
  const pagar = (id: string, valor: number, dia: number) => ({
    id,
    efeito: efeitoNoCaixa(valor, "PAGAR" as const),
    data: d(dia),
  });

  it("casa pelo valor e pega a data mais próxima", () => {
    const baixas = [receber("longe", reais(100), 1), receber("perto", reais(100), 5)];
    expect(sugerirBaixa({ valor: reais(100), data: d(6) }, baixas)?.id).toBe("perto");
  });

  it("casa saída do extrato com baixa de conta a pagar", () => {
    const baixas = [pagar("a", reais(2000), 7)];
    expect(sugerirBaixa({ valor: -reais(2000), data: d(7) }, baixas)?.id).toBe("a");
  });

  it("não casa entrada do extrato com pagamento do mesmo valor", () => {
    const baixas = [pagar("a", reais(500), 5)];
    expect(sugerirBaixa({ valor: reais(500), data: d(5) }, baixas)).toBeNull();
  });

  it("não sugere nada fora da tolerância de dias", () => {
    const baixas = [receber("a", reais(100), 1)];
    expect(sugerirBaixa({ valor: reais(100), data: d(20) }, baixas)).toBeNull();
  });

  it("não sugere nada com valor diferente", () => {
    const baixas = [receber("a", reais(100), 5)];
    expect(sugerirBaixa({ valor: reais(101), data: d(5) }, baixas)).toBeNull();
  });
});
