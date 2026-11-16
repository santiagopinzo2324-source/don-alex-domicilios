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
 * Abre WhatsApp Web con el número de Don Alex y un mensaje opcional.
 * Se usa el enlace web directo para evitar la redirección problemática
 * que algunos navegadores muestran al abrir api.whatsapp.com.
 */
export function enlaceWhatsApp(mensaje?: string): string {
  const base = `https://web.whatsapp.com/send?phone=${EMPRESA.whatsapp}`;
  return mensaje ? `${base}&text=${encodeURIComponent(mensaje)}` : base;
}
