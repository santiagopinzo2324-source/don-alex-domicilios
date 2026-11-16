/** Datos públicos de la empresa. Se moverán a la configuración administrable en la Etapa 3. */
export const EMPRESA = {
  nombre: "DOMICILIO INDEPENDIENTE DON ALEX",
  nombreCorto: "Don Alex",
  ciudad: "Pitalito, Huila",
  pais: "Colombia",
  whatsapp: "573118199006",
  whatsappVisible: "311 819 9006",
  horario: "Todos los días · 7:00 a. m. – 11:00 p. m.",
} as const;

/**
 * Genera un enlace universal de WhatsApp con un mensaje opcional.
 * wa.me permite que el dispositivo o navegador elija cómo abrir WhatsApp.
 */
export function enlaceWhatsApp(mensaje?: string): string {
  const base = `https://wa.me/${EMPRESA.whatsapp}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
