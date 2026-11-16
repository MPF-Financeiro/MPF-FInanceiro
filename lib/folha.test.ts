import { describe, expect, it } from "vitest";
import { calcularItemFolha, conferirFerias } from "@/lib/folha";
import { reais } from "@/lib/money";

describe("calcularItemFolha", () => {
  it("soma proventos e subtrai descontos", () => {
    const r = calcularItemFolha({
      salarioBruto: reais(3000),
      horasExtras: reais(200),
      bonificacoes: reais(500),
      inss: reais(330),
      irrf: reais(120),
    });
    expect(r.proventos).toBe(reais(3700));
    expect(r.descontos).toBe(reais(450));
    expect(r.liquido).toBe(reais(3250));
  });

  it("não soma vale ao líquido, porque o vale é pago à parte", () => {
    const semVale = calcularItemFolha({ salarioBruto: reais(2000) });
    expect(semVale.liquido).toBe(reais(2000));
  });

  it("recusa centavo quebrado", () => {
    expect(() => calcularItemFolha({ salarioBruto: 100.5 })).toThrow();
  });

  it("recusa valor negativo", () => {
    expect(() => calcularItemFolha({ salarioBruto: reais(1000), inss: -1 })).toThrow();
  });

  it("abre a conta linha a linha, com o líquido como total", () => {
    const r = calcularItemFolha({ salarioBruto: reais(1000), inss: reais(80) });
    expect(r.linhas.map((l) => l.rotulo)).toEqual(["Salário bruto", "INSS", "Líquido a pagar"]);
    expect(r.linhas[1].valor).toBe(-reais(80));
    expect(r.linhas.at(-1)?.total).toBe(true);
  });
});

describe("conferirFerias", () => {
  const d = (dia: number) => new Date(Date.UTC(2026, 10, dia));

  it("conta os dias incluindo o primeiro e o último", () => {
    expect(conferirFerias({ inicio: d(1), fim: d(20) }).diasGozo).toBe(20);
  });

  it("avisa quando gozo e venda passam de 30 dias", () => {
    const r = conferirFerias({ inicio: d(1), fim: d(25), diasVendidos: 10 });
    expect(r.total).toBe(35);
    expect(r.aviso).toContain("acima dos 30");
  });

  it("avisa quando a venda passa de 10 dias", () => {
    expect(conferirFerias({ inicio: d(1), fim: d(15), diasVendidos: 12 }).aviso).toContain(
      "até 10 dias"
    );
  });

  it("não reclama de férias normais", () => {
    expect(conferirFerias({ inicio: d(1), fim: d(30) }).aviso).toBeNull();
  });
});
