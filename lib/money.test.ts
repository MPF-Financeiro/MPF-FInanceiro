import { describe, expect, it } from "vitest";
import {
  calcularCascata,
  dividirRepasses,
  formatBRL,
  reais,
  saldo,
  statusDoTitulo,
} from "./money";

describe("calcularCascata", () => {
  it("abre a conta de uma venda com cupom, como na tela aprovada", () => {
    // Curso de Oratória: 697,00 − cupom 100,00 − NF 10% − Paga-me 1%
    const r = calcularCascata({
      bruto: reais(697),
      cupom: reais(100),
      notaBps: 1000,
      gatewayBps: 100,
    });
    expect(r.pago).toBe(reais(597));
    expect(r.nota).toBe(reais(59.7));
    expect(r.gateway).toBe(reais(5.97));
    expect(r.liquido).toBe(reais(531.33));
    expect(formatBRL(r.liquido)).toBe("R$ 531,33");
  });

  it("não cobra nota nem taxa sobre o desconto", () => {
    const comCupom = calcularCascata({
      bruto: reais(697),
      cupom: reais(100),
      notaBps: 1000,
    });
    const semCupom = calcularCascata({ bruto: reais(597), notaBps: 1000 });
    expect(comCupom.nota).toBe(semCupom.nota);
  });

  it("venda sem cupom não cria linha de cupom", () => {
    const r = calcularCascata({ bruto: reais(697), notaBps: 1000, gatewayBps: 100 });
    expect(r.linhas.map((l) => l.rotulo)).toEqual([
      "Preço de tabela",
      "Nota fiscal, 10%",
      "Taxa do Paga-me",
      "Líquido",
    ]);
    expect(r.liquido).toBe(reais(620.33));
  });

  it("a última linha é o líquido e fecha com a soma das anteriores", () => {
    const r = calcularCascata({
      bruto: reais(1997),
      cupom: reais(200),
      notaBps: 1000,
      gatewayBps: 450,
      gatewayFixo: reais(0.39),
    });
    const ultima = r.linhas[r.linhas.length - 1];
    expect(ultima.total).toBe(true);
    expect(ultima.valor).toBe(r.liquido);
    expect(r.pago - r.nota - r.gateway).toBe(r.liquido);
  });

  it("recusa cupom maior que o bruto", () => {
    expect(() => calcularCascata({ bruto: reais(100), cupom: reais(101) })).toThrow();
  });
});

describe("dividirRepasses", () => {
  it("a soma das parcelas é exatamente o líquido", () => {
    for (const n of [1, 2, 3, 6, 7, 12]) {
      const p = dividirRepasses(reais(1697.45), n);
      expect(p).toHaveLength(n);
      expect(p.reduce((a, b) => a + b, 0)).toBe(reais(1697.45));
    }
  });

  it("o resto fica na primeira parcela", () => {
    expect(dividirRepasses(100, 3)).toEqual([34, 33, 33]);
  });
});

describe("statusDoTitulo", () => {
  const vencimento = new Date(2026, 10, 10); // 10/11/2026
  const antes = new Date(2026, 10, 1);
  const depois = new Date(2026, 10, 20);

  it("aberto quando nada foi recebido e não venceu", () => {
    expect(statusDoTitulo({ valor: 1000, baixas: [], vencimento, hoje: antes })).toBe("ABERTO");
  });

  it("parcial quando recebeu parte e não venceu", () => {
    expect(statusDoTitulo({ valor: 1000, baixas: [400], vencimento, hoje: antes })).toBe("PARCIAL");
  });

  it("quitado mesmo depois do vencimento", () => {
    expect(statusDoTitulo({ valor: 1000, baixas: [600, 400], vencimento, hoje: depois })).toBe("QUITADO");
  });

  it("vencido ganha do parcial", () => {
    expect(statusDoTitulo({ valor: 1000, baixas: [400], vencimento, hoje: depois })).toBe("VENCIDO");
  });

  it("no próprio dia do vencimento ainda não está vencido", () => {
    expect(statusDoTitulo({ valor: 1000, baixas: [], vencimento, hoje: vencimento })).toBe("ABERTO");
  });

  it("cancelado ganha de tudo", () => {
    expect(
      statusDoTitulo({ valor: 1000, baixas: [], vencimento, hoje: depois, cancelado: true })
    ).toBe("CANCELADO");
  });
});

describe("saldo", () => {
  it("desconta todas as baixas", () => {
    expect(saldo(reais(1000), [reais(300), reais(250)])).toBe(reais(450));
  });
});
