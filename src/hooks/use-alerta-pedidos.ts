import { useCallback, useEffect, useRef, useState } from "react";

import { DURACION_MAXIMA_TIMBRE_MS, INTERVALO_TIMBRE_MS, ofertasNuevas } from "@/lib/alertas-pedidos";

const CLAVE_PREFERENCIA = "donalex:sonido-pedidos";

export interface OfertaAlerta {
  id: string;
  numero: number | string;
  entrega_direccion?: string | null;
}

type PermisoAvisos = NotificationPermission | "no-soportado";

/**
 * Timbre, vibración y aviso del sistema cuando le llega una oferta al domiciliario.
 * Los navegadores solo permiten sonido después de que la persona toca la página,
 * por eso la preferencia se guarda y el audio se reactiva con el primer toque.
 */
export function useAlertaPedidos(ofertas: OfertaAlerta[] | undefined) {
  const [activado, setActivado] = useState(false);
  const [listo, setListo] = useState(false);
  const [sonando, setSonando] = useState(false);
  const [permisoAvisos, setPermisoAvisos] = useState<PermisoAvisos>("default");

  const ctxRef = useRef<AudioContext | null>(null);
  const activadoRef = useRef(false);
  const conocidasRef = useRef<Set<string> | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE_PREFERENCIA) === "1";
    activadoRef.current = guardado;
    setActivado(guardado);
    setPermisoAvisos("Notification" in window ? Notification.permission : "no-soportado");
  }, []);

  const contexto = useCallback(() => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctxRef.current || ctxRef.current.state === "closed") ctxRef.current = new AudioCtx();
    return ctxRef.current;
  }, []);

  const desbloquear = useCallback(async () => {
    const ctx = contexto();
    if (!ctx) return false;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    const ok = ctx.state === "running";
    setListo(ok);
    return ok;
  }, [contexto]);

  // Tras recargar la página, el primer toque en cualquier parte reactiva el sonido.
  useEffect(() => {
    if (!activado || listo) return;
    const alTocar = () => void desbloquear();
    window.addEventListener("pointerdown", alTocar);
    window.addEventListener("keydown", alTocar);
    return () => {
      window.removeEventListener("pointerdown", alTocar);
      window.removeEventListener("keydown", alTocar);
    };
  }, [activado, listo, desbloquear]);

  /** Un timbre corto de tres notas, más vibración en celulares. */
  const tono = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "running") {
      const inicio = ctx.currentTime;
      [784, 1047, 1319].forEach((frecuencia, i) => {
        const t = inicio + i * 0.14;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(frecuencia, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.34);
      });
    }
    try { navigator.vibrate?.([260, 120, 260]); } catch { /* vibración no disponible */ }
  }, []);

  const detener = useCallback(() => {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    if (finRef.current) clearTimeout(finRef.current);
    intervaloRef.current = null;
    finRef.current = null;
    setSonando(false);
  }, []);

  /** Suena repetidamente hasta que el domiciliario responda, silencie o pasen 45 segundos. */
  const timbrar = useCallback(() => {
    if (!activadoRef.current) return;
    detener();
    tono();
    setSonando(true);
    intervaloRef.current = setInterval(tono, INTERVALO_TIMBRE_MS);
    finRef.current = setTimeout(detener, DURACION_MAXIMA_TIMBRE_MS);
  }, [detener, tono]);

  const avisoSistema = useCallback((oferta: OfertaAlerta) => {
    if (!activadoRef.current || !("Notification" in window) || Notification.permission !== "granted") return;
    if (!document.hidden) return;
    try {
      const aviso = new Notification(`Nuevo pedido #${oferta.numero} · Don Alex`, {
        body: oferta.entrega_direccion ? `Entrega: ${oferta.entrega_direccion}` : "Abre el portal para aceptarlo.",
        icon: "/favicon.png",
        tag: `oferta-${oferta.id}`,
      });
      aviso.onclick = () => { window.focus(); aviso.close(); };
    } catch { /* algunos celulares solo permiten avisos desde una app instalada */ }
  }, []);

  const clave = (ofertas ?? []).map((o) => o.id).join(",");
  useEffect(() => {
    if (!ofertas) return;
    const ids = ofertas.map((o) => o.id);
    const nuevas = ofertasNuevas(conocidasRef.current, ids);
    conocidasRef.current = new Set(ids);
    if (ids.length === 0) { detener(); return; }
    if (nuevas.length > 0) {
      timbrar();
      const primera = ofertas.find((o) => o.id === nuevas[0]);
      if (primera) avisoSistema(primera);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // Mientras suena, el título de la pestaña parpadea para verlo desde otras pestañas.
  useEffect(() => {
    if (!sonando) return;
    const original = document.title;
    let alterno = false;
    const t = setInterval(() => { alterno = !alterno; document.title = alterno ? "🔔 ¡Nuevo pedido!" : original; }, 1000);
    return () => { clearInterval(t); document.title = original; };
  }, [sonando]);

  useEffect(() => () => {
    detener();
    void ctxRef.current?.close().catch(() => {});
  }, [detener]);

  const activar = useCallback(async () => {
    window.localStorage.setItem(CLAVE_PREFERENCIA, "1");
    activadoRef.current = true;
    setActivado(true);
    await desbloquear();
    tono();
    if ("Notification" in window && Notification.permission === "default") {
      const permiso = await Notification.requestPermission().catch(() => "default" as const);
      setPermisoAvisos(permiso);
    }
  }, [desbloquear, tono]);

  const desactivar = useCallback(() => {
    window.localStorage.removeItem(CLAVE_PREFERENCIA);
    activadoRef.current = false;
    setActivado(false);
    detener();
  }, [detener]);

  const probar = useCallback(async () => { await desbloquear(); tono(); }, [desbloquear, tono]);

  const pedirAvisos = useCallback(async () => {
    if (!("Notification" in window)) return;
    const permiso = await Notification.requestPermission().catch(() => "default" as const);
    setPermisoAvisos(permiso);
  }, []);

  /** Un solo timbre (para avisos que no son pedidos). */
  const sonarUnaVez = useCallback(() => { if (activadoRef.current) tono(); }, [tono]);

  return { activado, listo, sonando, permisoAvisos, activar, desactivar, probar, pedirAvisos, detener, desbloquear, sonarUnaVez };
}

export type AlertaPedidos = ReturnType<typeof useAlertaPedidos>;
