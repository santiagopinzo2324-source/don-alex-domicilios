import { describe, expect, it } from "vitest";
import { liquidarServicio } from "../liquidacion";

describe("Liquidación de domiciliarios", () => {
  it("la empresa descuenta el 15% de un domicilio urbano de $6.000", () => {
    expect(liquidarServicio(6000)).toEqual({ valorServicio: 6000, comisionEmpresa: 900, pagoDomiciliario: 5100 });
  });
  it("aplica el mismo 15% a un servicio rural de $15.000", () => {
    expect(liquidarServicio(15000)).toMatchObject({ comisionEmpresa: 2250, pagoDomiciliario: 12750 });
  });
  it("respeta una comisión modificada por el administrador", () => {
    expect(liquidarServicio(6000, 0.2)).toMatchObject({ comisionEmpresa: 1200, pagoDomiciliario: 4800 });
  });
});
