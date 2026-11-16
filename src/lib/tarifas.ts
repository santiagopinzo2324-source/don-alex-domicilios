/**
 * Motor de tarifas de DOMICILIO INDEPENDIENTE DON ALEX.
 * Reglas oficiales:
 *  - Cualquier barrio del área urbana de Pitalito: tarifa general plana.
 *  - Sectores considerablemente alejados: tarifa de sector alejado.
 *  - Zonas rurales y recorridos especiales: desde la tarifa rural (o un valor especial mayor).
 *  - Si no se conoce la zona, NO se inventa una tarifa: se pide revisión administrativa.
 *  - El administrador puede fijar excepciones por destino.
 */

export type TipoZona = "urbana" | "alejada" | "rural" | "especial";

export interface ConfigTarifas {
  urbana: number;
  alejada: number;
  rural: number;
}

export const TARIFAS_POR_DEFECTO: ConfigTarifas = {
  urbana: 6000,
  alejada: 12000,
  rural: 15000,
};

export interface EntradaTarifa {
  /** Zona detectada del destino; null/undefined cuando no se pudo determinar. */
  zona: TipoZona | null | undefined;
  config?: ConfigTarifas;
  /** Valor fijado por el administrador para un destino concreto. */
  excepcion?: number | null;
  /** Valor acordado para un recorrido rural o especial (nunca menor que la tarifa rural). */
  valorEspecial?: number | null;
  /** El barrio no afecta la tarifa urbana; se acepta solo como dato informativo. */
  barrio?: string;
}

export type ResultadoTarifa =
  | { estado: "ok"; valor: number; zona: TipoZona; origen: "tarifa" | "excepcion" }
  | { estado: "revision"; motivo: string };

export function calcularTarifa(entrada: EntradaTarifa): ResultadoTarifa {
  const config = entrada.config ?? TARIFAS_POR_DEFECTO;
  const { zona } = entrada;

  if (!zona) {
    return {
      estado: "revision",
      motivo: "No se pudo determinar la zona del destino. Un administrador revisará la tarifa.",
    };
  }

  if (entrada.excepcion != null && entrada.excepcion > 0) {
    return { estado: "ok", valor: entrada.excepcion, zona, origen: "excepcion" };
  }

  switch (zona) {
    case "urbana":
      return { estado: "ok", valor: config.urbana, zona, origen: "tarifa" };
    case "alejada":
      return { estado: "ok", valor: config.alejada, zona, origen: "tarifa" };
    case "rural":
    case "especial": {
      const especial = entrada.valorEspecial ?? 0;
      return { estado: "ok", valor: Math.max(config.rural, especial), zona, origen: "tarifa" };
    }
  }
}

export interface ZonaGeografica {
  id: string;
  nombre: string;
  tipo: TipoZona;
  /** Mayor prioridad gana cuando un punto cae en varias zonas (p. ej. excepción dentro del área urbana). */
  prioridad: number;
  /** Polígono como lista de [lat, lng]. */
  poligono: Array<[number, number]>;
}

function dentroDePoligono(lat: number, lng: number, poligono: Array<[number, number]>): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const pi = poligono[i];
    const pj = poligono[j];
    if (!pi || !pj) continue;
    const [yi, xi] = pi;
    const [yj, xj] = pj;
    const cruza = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

/** Devuelve la zona configurada donde cae el punto, o null si no cae en ninguna. */
export function zonaDePunto(lat: number, lng: number, zonas: ZonaGeografica[]): ZonaGeografica | null {
  const coincidencias = zonas.filter((z) => z.poligono.length >= 3 && dentroDePoligono(lat, lng, z.poligono));
  if (coincidencias.length === 0) return null;
  return coincidencias.sort((a, b) => b.prioridad - a.prioridad)[0] ?? null;
}

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatearCOP(valor: number): string {
  return formatoCOP.format(valor).replace(/\s/g, "");
}
