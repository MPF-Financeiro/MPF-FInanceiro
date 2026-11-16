import { describe, expect, it } from "vitest";
import { somarMeses } from "./mes";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("somarMeses", () => {
  it("mantém o dia quando ele existe no mês de destino", () => {
    expect(iso(somarMeses(new Date("2026-01-15T00:00:00Z"), 1))).toBe("2026-02-15");
  });

  it("corta o dia 31 para o fim de fevereiro em vez de transbordar", () => {
    expect(iso(somarMeses(new Date("2026-01-31T00:00:00Z"), 1))).toBe("2026-02-28");
  });

  it("respeita o ano bissexto", () => {
    expect(iso(somarMeses(new Date("2024-01-31T00:00:00Z"), 1))).toBe("2024-02-29");
  });

  it("corta 31 para 30 em abril", () => {
    expect(iso(somarMeses(new Date("2026-03-31T00:00:00Z"), 1))).toBe("2026-04-30");
  });

  it("vira o ano", () => {
    expect(iso(somarMeses(new Date("2026-12-10T00:00:00Z"), 2))).toBe("2027-02-10");
  });

  it("anda para trás", () => {
    expect(iso(somarMeses(new Date("2026-03-31T00:00:00Z"), -1))).toBe("2026-02-28");
  });
});
