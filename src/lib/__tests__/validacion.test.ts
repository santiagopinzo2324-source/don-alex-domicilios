import { describe, expect, it } from "vitest";
import { esquemaCelular } from "../validacion";

describe("Celular colombiano", () => {
  it("acepta 311 819 9006 y lo guarda sin espacios", () => {
    expect(esquemaCelular.parse("311 819 9006")).toBe("3118199006");
  });
  it("acepta el prefijo +57", () => {
    expect(esquemaCelular.parse("+57 311 819 9006")).toBe("3118199006");
  });
  it("rechaza números fijos o incompletos", () => {
    expect(esquemaCelular.safeParse("8361234").success).toBe(false);
    expect(esquemaCelular.safeParse("611 819 9006").success).toBe(false);
  });
});
