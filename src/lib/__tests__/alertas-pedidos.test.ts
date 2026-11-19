import { describe, expect, it } from "vitest";

import { ofertasNuevas } from "@/lib/alertas-pedidos";

describe("ofertasNuevas", () => {
  it("detecta un pedido que acaba de llegar", () => {
    expect(ofertasNuevas(new Set(["a"]), ["a", "b"])).toEqual(["b"]);
  });
  it("no vuelve a sonar por un pedido que ya se avisó", () => {
    expect(ofertasNuevas(new Set(["a", "b"]), ["a", "b"])).toEqual([]);
  });
  it("al abrir el portal, avisa de los pedidos que ya están esperando", () => {
    expect(ofertasNuevas(null, ["a"])).toEqual(["a"]);
  });
});
