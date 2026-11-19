import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Clock3, MapPin, PackageCheck, Power, Wallet, Trophy, Star, Bell, BellRing, LifeBuoy, History, BarChart3, CheckCircle2, MessageSquareText, RefreshCw, Store, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { PanelSonido } from "@/components/domiciliario/PanelSonido";
import { Encabezado } from "@/components/sitio/Encabezado";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/integrations/db/esquema-externo";
import { supabase } from "@/integrations/supabase/client";
import { useAlertaPedidos } from "@/hooks/use-alerta-pedidos";
import { enlaceWhatsApp } from "@/lib/empresa";
import { liquidarServicio } from "@/lib/liquidacion";
import { formatearCOP } from "@/lib/tarifas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/domiciliario")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: "/domiciliario" } });
  },
  component: PortalDomiciliario,
});

function enlaceMapa(direccion: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

const ESTADOS: Record<string, string> = {
  asignado: "Pedido asignado",
  hacia_recogida: "Yendo al punto de recogida",
  recogido: "Pedido recogido",
  hacia_entrega: "En camino al cliente",
  entregado: "Entregado",
};

const PASOS = ["asignado", "hacia_recogida", "recogido", "hacia_entrega"];
const ETIQUETA_PASO: Record<string, string> = { asignado: "Asignado", hacia_recogida: "A recoger", recogido: "Recogido", hacia_entrega: "En camino" };
const TIPOS_SERVICIO: Record<string, string> = { restaurante: "Restaurante", domicilio: "Domicilio", compra: "Compra", recogida: "Recogida", mandado: "Mandado" };

function nombreMetodoPago(codigo: string | null) {
  if (!codigo) return "Por confirmar";
  return codigo.charAt(0).toUpperCase() + codigo.slice(1).replace(/_/g, " ");
}

function haceCuanto(fecha: string) {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 60000));
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} min`;
  return new Date(fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function PortalDomiciliario() {
  const [codigos, setCodigos] = useState<Record<string, string>>({});
  const [categoriaAyuda, setCategoriaAyuda] = useState("Problema con un pedido");
  const [mensajeAyuda, setMensajeAyuda] = useState("");
  const [motivosProblema, setMotivosProblema] = useState<Record<string, string>>({});
  const opcionesProblema = ["Tuve un problema con la moto", "Se me pinchó una llanta", "Tuve un accidente o percance en la vía", "Tengo un problema de salud", "No encuentro la dirección del cliente", "El cliente no contesta o no aparece", "Hay un problema con el pedido", "Otro inconveniente"];
  const enlaceWhatsAppProblema = (pedido: { numero: number | string; id: string }) => {
    const motivo = motivosProblema[pedido.id] || opcionesProblema[0];
    const mensaje = `Hola, soy domiciliario de Don Alex Domicilios. Tuve un inconveniente con el pedido #${pedido.numero}: ${motivo}. Necesito ayuda para solucionar la entrega.`;
    return enlaceWhatsApp(mensaje);
  };
  const qc = useQueryClient();
  const consulta = useQuery({
    queryKey: ["portal-domiciliario"],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Inicia sesión.");
      const [perfil, disponibles, asignados, ganancias, ranking, calificaciones, actividad, avisos, ayudas] = await Promise.all([
        db.from("domiciliarios").select("estado, disponible, numero").eq("user_id", auth.user.id).maybeSingle(),
        (supabase as any).from("pedido_ofertas_domiciliarios").select("pedido_id, ofrecido_at").eq("domiciliario_id", auth.user.id).eq("estado", "ofrecido").order("ofrecido_at", { ascending: true }).limit(1),
        supabase.from("pedidos").select("id, numero, cliente_nombre, cliente_telefono, recogida_direccion, entrega_direccion, entrega_barrio, valor_domicilio, estado").eq("domiciliario_id", auth.user.id).in("estado", ["asignado", "hacia_recogida", "recogido", "hacia_entrega"]).order("asignado_at", { ascending: false }),
        supabase.from("pedidos").select("id, numero, pago_domiciliario, pago_domiciliario_liquidado, estado, created_at, entregado_at").eq("domiciliario_id", auth.user.id).in("estado", ["entregado", "finalizado"]).order("entregado_at", { ascending: false }).limit(100),
        (supabase as any).from("ranking_domiciliarios").select("domiciliario_id, puesto, entregas, promedio_calificacion").eq("domiciliario_id", auth.user.id).maybeSingle(),
        (supabase as any).from("calificaciones_domiciliarios").select("id, estrellas, comentario, created_at").eq("domiciliario_id", auth.user.id).order("created_at", { ascending: false }).limit(20),
        (supabase as any).from("domiciliario_actividad").select("tipo, created_at").eq("domiciliario_id", auth.user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("notificaciones").select("id, titulo, cuerpo, leida, created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(15),
        (supabase as any).from("solicitudes_ayuda_domiciliarios").select("id, categoria, descripcion, estado, respuesta, created_at").eq("domiciliario_id", auth.user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      const ofertaIds = (disponibles.data ?? []).map((o: { pedido_id: string }) => o.pedido_id);
      const pedidosOferta = ofertaIds.length ? await supabase.from("pedidos").select("id, numero, tipo_servicio, cliente_nombre, cliente_telefono, recogida_direccion, entrega_direccion, entrega_barrio, valor_domicilio, metodo_pago, descripcion, observaciones, estado, created_at").in("id", ofertaIds).order("created_at", { ascending: true }) : { data: [], error: null };
      const error = [perfil, disponibles, asignados, ganancias, ranking, calificaciones, actividad, avisos, ayudas, pedidosOferta].find((r) => r.error)?.error;
      if (error) throw error;
      return {
        perfil: perfil.data ? { ...perfil.data, estado: perfil.data.estado as string } : null,
        disponibles: pedidosOferta.data ?? [],
        asignados: asignados.data ?? [],
        total: (ganancias.data ?? []).reduce((sum, p) => sum + (p.pago_domiciliario ?? 0), 0),
        pendiente: (ganancias.data ?? []).filter((p) => !p.pago_domiciliario_liquidado).reduce((sum, p) => sum + (p.pago_domiciliario ?? 0), 0),
        pagado: (ganancias.data ?? []).filter((p) => p.pago_domiciliario_liquidado).reduce((sum, p) => sum + (p.pago_domiciliario ?? 0), 0),
        historial: ganancias.data ?? [], ranking: ranking.data, calificaciones: (calificaciones.data ?? []) as Array<{ id: string; estrellas: number; comentario: string | null; created_at: string }>,
        actividad: actividad.data ?? [], avisos: avisos.data ?? [], ayudas: (ayudas.data ?? []) as Array<{ id: string; categoria: string; descripcion: string; estado: string; respuesta: string | null; created_at: string }>,
      };
    },
  });

  const actualizar = useMutation({
    mutationFn: async ({ fn, args }: { fn: string; args: Record<string, unknown> }) => {
      const { error } = await supabase.rpc(fn as never, args as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-domiciliario"] }),
    onError: (e: Error) => toast.error(e.message || "No se pudo completar la acción"),
  });

  const solicitarPostulacion = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Inicia sesión para enviar tu postulación.");
      const { error } = await (supabase as any).from("profiles")
        .update({ tipo_cuenta_solicitada: "domiciliario" })
        .eq("id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tu postulación fue enviada a administración.");
      void qc.invalidateQueries({ queryKey: ["portal-domiciliario"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo enviar la postulación."),
  });

  const d = consulta.data;
  const alerta = useAlertaPedidos(d?.disponibles);
  const { sonarUnaVez } = alerta;
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let vigente = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!vigente || !data.user) return;
      const usuarioId = data.user.id;
      const refrescar = () => void qc.invalidateQueries({ queryKey: ["portal-domiciliario"] });
      // El timbre de ofertas lo maneja useAlertaPedidos al ver la lista nueva; aquí solo se refresca.
      channel = supabase.channel(`portal-domi-${usuarioId}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, refrescar)
        .on("postgres_changes", { event: "*", schema: "public", table: "pedido_ofertas_domiciliarios", filter: `domiciliario_id=eq.${usuarioId}` }, refrescar)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones", filter: `user_id=eq.${usuarioId}` }, (payload) => {
          refrescar();
          const aviso = payload.new as { titulo?: string; pedido_id?: string | null };
          if (!aviso.pedido_id) { sonarUnaVez(); toast(aviso.titulo || "Tienes una nueva notificación."); }
        })
        .subscribe();
    });
    return () => { vigente = false; if (channel) void supabase.removeChannel(channel); };
  }, [qc, sonarUnaVez]);

  const activo = d?.perfil?.estado === "activo";
  const puedeSolicitarReingreso = ["rechazado", "retirado", "suspendido"].includes(d?.perfil?.estado ?? "");
  const cambiarEstado = (id: string, estado: string) =>
    actualizar.mutate({ fn: "domiciliario_actualizar_estado", args: { _pedido_id: id, _estado: estado } });
  const registrarActividad = (tipo: string) => actualizar.mutate({ fn: "domiciliario_registrar_actividad", args: { _tipo: tipo } });
  const confirmarRecogida = (id: string) =>
    actualizar.mutate({ fn: "domiciliario_confirmar_recogida", args: { _pedido_id: id, _codigo: codigos[id] ?? "" } });

  const disponible = Boolean(d?.perfil?.disponible);
  const inicioHoy = new Date(); inicioHoy.setHours(0, 0, 0, 0);
  const ganadoHoy = (d?.historial ?? []).filter((p) => new Date(p.entregado_at ?? p.created_at) >= inicioHoy).reduce((s, p) => s + (p.pago_domiciliario ?? 0), 0);
  const entregasHoy = (d?.historial ?? []).filter((p) => new Date(p.entregado_at ?? p.created_at) >= inicioHoy).length;
  const cambiarDisponibilidad = () => {
    const siguiente = !disponible;
    void alerta.desbloquear();
    actualizar.mutate({ fn: "domiciliario_disponibilidad", args: { _disponible: siguiente } });
    registrarActividad(siguiente ? "reanudar" : "pausa");
  };

  return (
    <div className="min-h-screen bg-brand-mist">
      <Encabezado />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-brand p-6 text-on-brand shadow-soft sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-glow opacity-60" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-on-brand-muted">Zona de trabajo</p>
              <h1 className="mt-1 font-display text-3xl font-bold">Portal del domiciliario</h1>
              <p className="mt-2 text-sm text-on-brand-muted">Tus pedidos, entregas y ganancias en un solo lugar.</p>
              {d?.perfil?.numero != null && <p className="mt-3 inline-flex rounded-full bg-on-brand/15 px-3 py-1 text-sm font-bold">Tu código: DOM-{String(d.perfil.numero).padStart(3, "0")}</p>}
            </div>
            {activo && <div className="flex flex-col items-start gap-3 sm:items-end">
              <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold", disponible ? "bg-on-brand text-brand-deep" : "bg-on-brand/15 text-on-brand")}>
                <span className={cn("size-2.5 rounded-full", disponible ? "animate-pulse bg-whatsapp" : "bg-on-brand-muted")} />
                {disponible ? "Disponible para recibir pedidos" : "En pausa: no recibes pedidos"}
              </span>
              <Button variant="onBrand" size="lg" disabled={actualizar.isPending} onClick={cambiarDisponibilidad}><Power className="mr-2 size-4" />{disponible ? "Pausar disponibilidad" : "Estoy disponible"}</Button>
            </div>}
          </div>
        </section>
        {consulta.isLoading && <p className="mt-8 text-sm text-muted-foreground">Cargando tu información…</p>}
        {consulta.isError && <div role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive"><p className="font-semibold">No se pudo cargar el portal.</p><p className="mt-1 break-words">{consulta.error instanceof Error ? consulta.error.message : "Ocurrió un error inesperado al consultar tu cuenta."}</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void qc.invalidateQueries({ queryKey: ["portal-domiciliario"] })}>Volver a intentar</Button></div>}
        {d && d.perfil?.estado !== "activo" && <section className="mt-8 rounded-2xl border border-brand-lilac bg-card p-6"><Clock3 className="size-8 text-primary" /><h2 className="mt-3 text-xl font-bold text-foreground">{d?.perfil?.estado === "pendiente" ? "Solicitud en revisión" : d?.perfil?.estado === "rechazado" ? "Solicitud rechazada" : d?.perfil?.estado === "retirado" || d?.perfil?.estado === "suspendido" ? "Cuenta deshabilitada" : "Solicitud de domiciliario"}</h2><p className="mt-2 text-sm text-muted-foreground">{d?.perfil?.estado === "pendiente" ? "Tu solicitud está pendiente de revisión por la administración." : puedeSolicitarReingreso ? "Puedes enviar una nueva solicitud desde esta misma cuenta. La administración revisará nuevamente tu información antes de habilitarte." : "Tu cuenta todavía no está aprobada. Cuando la administración revise tus datos y confirme los requisitos aplicables, podrás activar tu disponibilidad y recibir pedidos."}</p><p className="mt-3 text-xs text-muted-foreground">Estado actual: {d?.perfil?.estado ?? "No hay solicitud registrada"}</p>{!d?.perfil && <Button className="mt-4" disabled={solicitarPostulacion.isPending} onClick={() => solicitarPostulacion.mutate()}>{solicitarPostulacion.isPending ? "Enviando..." : "Enviar mi postulación"}</Button>}{d?.perfil?.estado === "pendiente" && <Button variant="outline" className="mt-4" disabled={actualizar.isPending} onClick={() => { if (window.confirm("¿Quieres cancelar tu solicitud como domiciliario? Podrás volver a postularte más adelante.")) actualizar.mutate({ fn: "domiciliario_retirar_postulacion", args: {} }); }}>Cancelar mi solicitud</Button>}{puedeSolicitarReingreso && <Button className="mt-4" disabled={actualizar.isPending} onClick={() => actualizar.mutate({ fn: "domiciliario_solicitar_reingreso", args: {} })}>Enviar nueva postulación</Button>}</section>}
        {activo && <>
          <PanelSonido alerta={alerta} />

          <section className="mt-8" aria-live="polite">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 className="font-display text-2xl font-bold text-foreground">Pedidos para ti</h2><p className="mt-1 text-sm text-muted-foreground">Se actualiza solo. Acepta rápido: si no respondes, el pedido pasa a otro compañero.</p></div>
              <Button size="sm" variant="outline" onClick={() => void qc.invalidateQueries({ queryKey: ["portal-domiciliario"] })}><RefreshCw className="mr-2 size-4" />Actualizar</Button>
            </div>
            {alerta.sonando && <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-vivid p-4 text-on-brand shadow-brand">
              <span className="flex items-center gap-2 font-semibold"><BellRing className="size-5 animate-bounce" />¡Te llegó un pedido nuevo!</span>
              <Button size="sm" variant="onBrand" onClick={alerta.detener}><VolumeX className="mr-2 size-4" />Silenciar</Button>
            </div>}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {d?.disponibles.map((p) => {
                const { pagoDomiciliario } = liquidarServicio(p.valor_domicilio ?? 0);
                return <article key={p.id} className="relative rounded-3xl border-2 border-brand-vivid bg-card p-5 shadow-lift">
                  <span className="absolute right-4 top-4 flex size-3"><span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-vivid opacity-60" /><span className="relative inline-flex size-3 rounded-full bg-brand-vivid" /></span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-vivid">{TIPOS_SERVICIO[p.tipo_servicio] ?? "Servicio"} · Pedido #{p.numero}</p>
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                    <div><p className="text-sm text-muted-foreground">Tú recibes</p><p className="font-display text-3xl font-bold text-foreground">{formatearCOP(pagoDomiciliario)}</p></div>
                    <div className="text-right text-xs text-muted-foreground"><p>Domicilio {formatearCOP(p.valor_domicilio ?? 0)}</p><p>Pago: {nombreMetodoPago(p.metodo_pago)}</p><p>Llegó {haceCuanto(p.created_at)}</p></div>
                  </div>
                  <div className="mt-4 space-y-2 rounded-2xl bg-brand-mist p-3 text-sm">
                    <p className="flex items-start gap-2"><Store className="mt-0.5 size-4 shrink-0 text-primary" /><span><strong>Recoge:</strong> {p.recogida_direccion || "Por confirmar"}</span></p>
                    <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span><strong>Entrega:</strong> {p.entrega_direccion}{p.entrega_barrio ? " · " + p.entrega_barrio : ""}</span></p>
                    {(p.descripcion || p.observaciones) && <p className="flex items-start gap-2 text-muted-foreground"><MessageSquareText className="mt-0.5 size-4 shrink-0" /><span>{[p.descripcion, p.observaciones].filter(Boolean).join(" · ")}</span></p>}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Cliente: {p.cliente_nombre || "Por confirmar"}</p>
                  <a href={enlaceMapa(p.entrega_direccion)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPin className="size-4" /> Ver destino en el mapa</a>
                  <div className="mt-4 grid grid-cols-[2fr_1fr] gap-2">
                    <Button variant="hero" size="lg" disabled={actualizar.isPending || !disponible} onClick={() => { alerta.detener(); actualizar.mutate({ fn: "domiciliario_aceptar_oferta", args: { _pedido_id: p.id } }); }}><CheckCircle2 className="mr-2 size-5" />Aceptar</Button>
                    <Button variant="outline" size="lg" disabled={actualizar.isPending} onClick={() => { alerta.detener(); actualizar.mutate({ fn: "domiciliario_rechazar_oferta", args: { _pedido_id: p.id } }); }}>Rechazar</Button>
                  </div>
                  {!disponible && <p className="mt-2 text-xs text-muted-foreground">Activa tu disponibilidad para aceptar pedidos.</p>}
                </article>;
              })}
              {d?.disponibles.length === 0 && <div className="rounded-3xl border border-dashed border-brand-lilac bg-card p-6 text-center md:col-span-2"><Bike className="mx-auto size-8 text-brand-lilac" /><p className="mt-2 font-semibold text-foreground">{disponible ? "Esperando pedidos…" : "Estás en pausa"}</p><p className="mt-1 text-sm text-muted-foreground">{disponible ? (alerta.activado ? "Sonará un timbre en cuanto te llegue uno." : "Activa el sonido para enterarte al instante.") : "Toca «Estoy disponible» para empezar a recibir pedidos."}</p></div>}
            </div>
          </section>

          <section className="mt-8"><h2 className="font-display text-2xl font-bold text-foreground">Mis pedidos activos</h2><div className="mt-4 space-y-4">
            {d?.asignados.map((p) => { const siguiente: Record<string, string> = { asignado: "hacia_recogida", recogido: "hacia_entrega", hacia_entrega: "entregado" }; const paso = PASOS.indexOf(p.estado); return <article key={p.id} className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap justify-between gap-2"><strong className="font-display text-lg">Pedido #{p.numero}</strong><span className="rounded-full bg-brand-lavender px-3 py-1 text-sm font-semibold text-primary">{ESTADOS[p.estado]}</span></div>
              <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Avance del pedido">{PASOS.map((e, i) => <li key={e} className="space-y-1"><span className={cn("block h-1.5 rounded-full", i <= paso ? "bg-brand-vivid" : "bg-muted")} /><span className={cn("block text-[11px] leading-tight", i <= paso ? "font-semibold text-foreground" : "text-muted-foreground")}>{ETIQUETA_PASO[e]}</span></li>)}</ol>
              <p className="mt-4 text-sm">Cliente: {p.cliente_nombre} · <a className="font-semibold text-primary hover:underline" href={`tel:${p.cliente_telefono}`}>{p.cliente_telefono}</a></p>
              <p className="mt-1 text-sm text-muted-foreground">Recoger: {p.recogida_direccion || "Según indicaciones del pedido"}</p>
              <a href={enlaceMapa(p.recogida_direccion || "")} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPin className="size-4" /> Navegar al punto de recogida</a>
              <p className="mt-2 text-sm text-muted-foreground">Entregar: {p.entrega_direccion}{p.entrega_barrio ? " · " + p.entrega_barrio : ""}</p>
              <a href={enlaceMapa(p.entrega_direccion)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPin className="size-4" /> Navegar al destino</a>
              {p.estado === "hacia_recogida" ? <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input inputMode="numeric" maxLength={6} placeholder="Código de 6 dígitos del cliente" value={codigos[p.id] ?? ""} onChange={(e) => setCodigos((actual) => ({ ...actual, [p.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))} /><Button disabled={actualizar.isPending || (codigos[p.id] ?? "").length !== 6} onClick={() => confirmarRecogida(p.id)}>Confirmar recogida</Button></div>
                : p.estado === "asignado" ? <Button className="mt-4" size="lg" disabled={actualizar.isPending} onClick={() => cambiarEstado(p.id, "hacia_recogida")}>Voy al punto de recogida</Button>
                : <><Button className="mt-4" size="lg" disabled={actualizar.isPending} onClick={() => { const proximo = siguiente[p.estado]; if (proximo) cambiarEstado(p.id, proximo); }}>{p.estado === "recogido" ? "Iniciar entrega al cliente" : "Marcar como entregado"}</Button>
                  {(p.estado === "recogido" || p.estado === "hacia_entrega") && <div className="mt-4 rounded-2xl border border-brand-lilac bg-brand-lavender p-4"><p className="font-semibold text-foreground">¿Tuviste un problema con la entrega?</p><p className="mt-1 text-sm text-muted-foreground">Selecciona lo que ocurrió y comunícate de inmediato con la empresa.</p><select className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={motivosProblema[p.id] || opcionesProblema[0]} onChange={(e) => setMotivosProblema((actual) => ({ ...actual, [p.id]: e.target.value }))}>{opcionesProblema.map((motivo) => <option key={motivo} value={motivo}>{motivo}</option>)}</select><Button asChild variant="whatsapp" className="mt-3 w-full"><a href={enlaceWhatsAppProblema(p)} target="_blank" rel="noreferrer">Contactar a la empresa por WhatsApp</a></Button></div>}</>}
            </article>; })}
            {d?.asignados.length === 0 && <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">Todavía no tienes pedidos asignados.</p>}
          </div></section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Resumen icono={Wallet} titulo="Ganado hoy" valor={formatearCOP(ganadoHoy)} detalle={`${entregasHoy} ${entregasHoy === 1 ? "entrega" : "entregas"} hoy`} />
            <Resumen icono={Wallet} titulo="Pendiente de liquidar" valor={formatearCOP(d?.pendiente ?? 0)} />
            <Resumen icono={Wallet} titulo="Ya liquidado" valor={formatearCOP(d?.pagado ?? 0)} />
            <Resumen icono={PackageCheck} titulo="Ganancias registradas" valor={formatearCOP(d?.total ?? 0)} />
            <Resumen icono={Trophy} titulo="Tu puesto en el equipo" valor={d?.ranking?.puesto ? "#"+d.ranking.puesto : "—"} />
            <Resumen icono={BarChart3} titulo="Entregas históricas" valor={String(d?.historial.length ?? 0)} />
            <Resumen icono={Star} titulo="Promedio de estrellas" valor={d?.ranking?.promedio_calificacion ? Number(d.ranking.promedio_calificacion).toFixed(1)+"/5" : "Sin calificaciones"} />
            <Resumen icono={Clock3} titulo="Actividad registrada" valor={String(d?.actividad.length ?? 0)+" eventos"} />
          </section>
          <section className="mt-8 rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Bell className="size-5 text-primary"/> Notificaciones</h2>
            <div className="mt-3 space-y-2">{d?.avisos.map((n) => <article key={n.id} className="rounded-xl bg-muted/50 p-3"><div className="flex justify-between gap-2"><strong className="text-sm">{n.titulo}</strong><span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("es-CO")}</span></div><p className="mt-1 text-sm text-muted-foreground">{n.cuerpo}</p></article>)}{!d?.avisos.length && <p className="text-sm text-muted-foreground">Todavía no tienes notificaciones.</p>}</div>
          </section>
          <section className="mt-8 rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold"><History className="size-5 text-primary"/> Historial de entregas</h2>
            <div className="mt-3 space-y-2">{d?.historial.map((p) => <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"><div><strong>Pedido #{p.numero}</strong><p className="text-xs text-muted-foreground">{new Date(p.entregado_at ?? p.created_at).toLocaleString("es-CO")} · {p.estado}</p></div><strong>{formatearCOP(p.pago_domiciliario ?? 0)}</strong></article>)}{!d?.historial.length && <p className="text-sm text-muted-foreground">Aún no tienes entregas finalizadas.</p>}</div>
          </section>
          <section className="mt-8 rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Star className="size-5 text-primary"/> Tus calificaciones</h2>
            <div className="mt-3 space-y-2">{d?.calificaciones.map((r) => <article key={r.id} className="rounded-xl bg-muted/50 p-3"><strong>{"★".repeat(r.estrellas)}{"☆".repeat(5-r.estrellas)}</strong><p className="mt-1 text-sm">{r.comentario || "Sin comentario"}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("es-CO")} · Cliente anónimo</p></article>)}{!d?.calificaciones.length && <p className="text-sm text-muted-foreground">Todavía no tienes calificaciones.</p>}</div>
          </section>
          <section className="mt-8 rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold"><LifeBuoy className="size-5 text-primary"/> Ayuda al domiciliario</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr_auto]">
              <select className="rounded-xl border border-input bg-background px-3 py-2 text-sm" value={categoriaAyuda} onChange={(e)=>setCategoriaAyuda(e.target.value)}><option>Problema con un pedido</option><option>Problema con un cliente</option><option>Problema con un establecimiento</option><option>Problema con un pago</option><option>Otro asunto</option></select>
              <Input placeholder="Cuéntanos qué ocurrió" value={mensajeAyuda} onChange={(e)=>setMensajeAyuda(e.target.value)} />
              <Button disabled={!mensajeAyuda.trim() || actualizar.isPending} onClick={async()=>{const {data:userData}=await supabase.auth.getUser(); if(!userData.user)return; const {error}=await (supabase as any).from("solicitudes_ayuda_domiciliarios").insert({domiciliario_id:userData.user.id,categoria:categoriaAyuda,descripcion:mensajeAyuda.trim()}); if(error){toast.error(error.message);return;} setMensajeAyuda(""); toast.success("Tu reporte fue enviado."); void qc.invalidateQueries({queryKey:["portal-domiciliario"]});}}>Enviar reporte</Button>
            </div>
            <div className="mt-3 space-y-2">{d?.ayudas.map((a)=><article key={a.id} className="rounded-xl bg-muted/50 p-3 text-sm"><div className="flex justify-between"><strong>{a.categoria}</strong><span>{a.estado}</span></div><p>{a.descripcion}</p>{a.respuesta&&<p className="mt-1 text-primary">Respuesta: {a.respuesta}</p>}</article>)}</div>
          </section>
        </>}
      </main>
    </div>
  );
}

function Resumen({ icono: Icono, titulo, valor, detalle }: { icono: typeof Wallet; titulo: string; valor: string; detalle?: string }) {
  return <article className="rounded-2xl border border-border bg-card p-5 shadow-soft"><Icono className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{titulo}</p><p className="mt-1 font-display text-2xl font-bold text-foreground">{valor}</p>{detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}</article>;
}
