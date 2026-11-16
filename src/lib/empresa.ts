/** Datos públicos de la empresa. Se moverán a la configuración administrable en la Etapa 3. */
export const EMPRESA = {
  nombre: "DOMICILIO INDEPENDIENTE DON ALEX",
  nombreCorto: "Don Alex",
  ciudad: "Pitalito, Huila",
  pais: "Colombia",
  // PENDIENTE: número oficial de WhatsApp Business (formato 57XXXXXXXXXX). Valor provisional.
  whatsapp: "573000000000",
  horario: "Todos los días · 7:00 a. m. – 10:00 p. m.",
} as const;

export function enlaceWhatsApp(mensaje?: string): string {
  const base = `https://wa.me/${EMPRESA.whatsapp}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
