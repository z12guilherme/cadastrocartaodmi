import { describe, it, expect } from "vitest";
import { 
  formatDateToISO, 
  cleanAddressPart, 
  calcularValorPlano,
  formatarMoeda 
} from "@/services/api";

describe("API Utils - Regras de Negócio", () => {
  describe("Conversão de Datas (formatDateToISO)", () => {
    it("deve converter DD/MM/YYYY para YYYY-MM-DD", () => {
      expect(formatDateToISO("25/10/2023")).toBe("2023-10-25");
    });

    it("deve manter o formato se já for ISO (YYYY-MM-DD)", () => {
      expect(formatDateToISO("2023-10-25")).toBe("2023-10-25");
    });

    it("deve retornar null para datas inválidas ou indefinidas", () => {
      expect(formatDateToISO(undefined)).toBeNull();
      expect(formatDateToISO("data-invalida")).toBeNull();
    });
  });

  describe("Limpeza de Endereço (cleanAddressPart)", () => {
    it("deve retornar undefined para strings vazias, nulas ou literais 'undefined'", () => {
      expect(cleanAddressPart("")).toBeUndefined();
      expect(cleanAddressPart("   ")).toBeUndefined();
      expect(cleanAddressPart(null)).toBeUndefined();
      expect(cleanAddressPart("undefined")).toBeUndefined();
    });

    it("deve retornar a própria string se for válida", () => {
      expect(cleanAddressPart("Centro")).toBe("Centro");
      expect(cleanAddressPart("Rua das Flores, 123")).toBe("Rua das Flores, 123");
    });
  });

  describe("Cálculo de Mensalidade (calcularValorPlano)", () => {
    it("deve calcular R$ 30,00 para o plano Individual (0 dependentes)", () => {
      expect(calcularValorPlano(0)).toBe(30.0);
    });

    it("deve calcular R$ 50,00 para 1 titular + 1 dependente (R$ 25 cada)", () => {
      expect(calcularValorPlano(1)).toBe(50.0);
    });

    it("deve calcular R$ 100,00 para 1 titular + 3 dependentes", () => {
      expect(calcularValorPlano(3)).toBe(100.0);
    });
  });
});