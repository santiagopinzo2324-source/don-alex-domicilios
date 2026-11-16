/** Comisión de la empresa sobre cada servicio realizado por un domiciliario. */
export const COMISION_EMPRESA_POR_DEFECTO = 0.15;

export interface Liquidacion {
  valorServicio: number;
  comisionEmpresa: number;
  pagoDomiciliario: number;
}

/** Divide el valor del domicilio entre la empresa (comisión) y el domiciliario. Redondea a pesos enteros. */
export function liquidarServicio(valorServicio: number, comision = COMISION_EMPRESA_POR_DEFECTO): Liquidacion {
  if (!Number.isFinite(valorServicio) || valorServicio < 0) throw new Error("Valor de servicio inválido");
  if (comision < 0 || comision > 1) throw new Error("Comisión inválida");
  const comisionEmpresa = Math.round(valorServicio * comision);
  return { valorServicio, comisionEmpresa, pagoDomiciliario: valorServicio - comisionEmpresa };
}
