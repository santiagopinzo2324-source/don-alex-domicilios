import { describe, expect, it } from "vitest";
import { calcularTarifa, formatearCOP, zonaDePunto, type ZonaGeografica } from "../tarifas";

describe("Tarifas Don Alex", () => {
  it("cobra $6.000 en cualquier barrio del área urbana", () => {
    const centro = calcularTarifa({ zona: "urbana", barrio: "Centro" });
    const extremo = calcularTarifa({ zona: "urbana", barrio: "Barrio al otro extremo" });
    expect(centro).toMatchObject({ estado: "ok", valor: 6000 });
    expect(extremo).toMatchObject({ estado: "ok", valor: 6000 });
  });

  it("cobra $12.000 en sectores considerablemente alejados", () => {
    expect(calcularTarifa({ zona: "alejada" })).toMatchObject({ estado: "ok", valor: 12000 });
  });

  it("cobra desde $15.000 en zona rural y nunca menos", () => {
    expect(calcularTarifa({ zona: "rural" })).toMatchObject({ valor: 15000 });
    expect(calcularTarifa({ zona: "especial", valorEspecial: 10000 })).toMatchObject({ valor: 15000 });
    expect(calcularTarifa({ zona: "rural", valorEspecial: 20000 })).toMatchObject({ valor: 20000 });
  });

  it("pide revisión administrativa cuando no conoce la zona", () => {
    expect(calcularTarifa({ zona: null }).estado).toBe("revision");
    expect(calcularTarifa({ zona: undefined }).estado).toBe("revision");
  });

  it("respeta los precios modificados por el administrador", () => {
    const config = { urbana: 7000, alejada: 13000, rural: 16000 };
    expect(calcularTarifa({ zona: "urbana", config })).toMatchObject({ valor: 7000 });
  });

  it("aplica una excepción por destino fijada por el administrador", () => {
    expect(calcularTarifa({ zona: "alejada", excepcion: 9000 })).toMatchObject({
      valor: 9000,
      origen: "excepcion",
    });
  });

  it("ubica un punto en la zona de mayor prioridad y devuelve null fuera de todas", () => {
    const zonas: ZonaGeografica[] = [
      { id: "u", nombre: "Urbana", tipo: "urbana", prioridad: 1, poligono: [[0, 0], [0, 10], [10, 10], [10, 0]] },
      { id: "a", nombre: "Alejada", tipo: "alejada", prioridad: 2, poligono: [[8, 8], [8, 10], [10, 10], [10, 8]] },
    ];
    expect(zonaDePunto(5, 5, zonas)?.tipo).toBe("urbana");
    expect(zonaDePunto(9, 9, zonas)?.tipo).toBe("alejada");
    expect(zonaDePunto(20, 20, zonas)).toBeNull();
  });

  it("muestra los valores en pesos colombianos", () => {
    expect(formatearCOP(31000)).toBe("$31.000");
  });
});
