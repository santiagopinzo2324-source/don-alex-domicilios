/** Devuelve las ofertas que no estaban en la lista anterior. En la primera carga, todas cuentan como nuevas. */
export function ofertasNuevas(conocidas: ReadonlySet<string> | null, actuales: readonly string[]): string[] {
  if (conocidas === null) return [...actuales];
  return actuales.filter((id) => !conocidas.has(id));
}

/** Cada cuánto suena el timbre mientras haya una oferta sin responder, y cuándo se detiene solo. */
export const INTERVALO_TIMBRE_MS = 2800;
export const DURACION_MAXIMA_TIMBRE_MS = 45_000;
