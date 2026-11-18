import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Clock3, MapPin, PackageCheck, Power, Wallet, Trophy, Star, Bell, LifeBuoy, History, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { Encabezado } from "@/components/sitio/Encabezado";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatearCOP } from "@/lib/tarifas";

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

function PortalDomiciliario() {
  const [codigos, setCodigos] = useState<Record<string, string>>({});
  const [categoriaAyuda, setCategoriaAyuda] = useState("Problema con un pedido");
  const [mensajeAyuda, setMensajeAyuda] = useState("");
  const qc = useQueryClient();
  const consulta = useQuery({
    queryKey: ["portal-domiciliario"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Inicia sesión.");
      const [perfil, disponibles, asignados, ganancias, ranking, calificaciones, actividad, avisos, ayudas] = await Promise.all([
        supabase.from("domiciliarios").select("estado, disponible, numero").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("pedidos").select("id, numero, cliente_nombre, cliente_telefono, recogida_direccion, entrega_direccion, entrega_barrio, valor_domicilio, estado, created_at").is("domiciliario_id", null).in("estado", ["listo", "confirmado"]).order("created_at", { ascending: true }).limit(20),
        supabase.from("pedidos").select("id, numero, cliente_nombre, cliente_telefono, recogida_direccion, entrega_direccion, entrega_barrio, valor_domicilio, estado").eq("domiciliario_id", auth.user.id).in("estado", ["asignado", "hacia_recogida", "recogido", "hacia_entrega"]).order("asignado_at", { ascending: false }),
        supabase.from("pedidos").select("id, numero, pago_domiciliario, pago_domiciliario_liquidado, estado, created_at, entregado_at").eq("domiciliario_id", auth.user.id).in("estado", ["entregado", "finalizado"]).order("entregado_at", { ascending: false }).limit(100),
        (supabase as any).from("ranking_domiciliarios").select("domiciliario_id, puesto, entregas, promedio_calificacion").eq("domiciliario_id", auth.user.id).maybeSingle(),
        (supabase as any).from("calificaciones_domiciliarios").select("id, estrellas, comentario, created_at").eq("domiciliario_id", auth.user.id).order("created_at", { ascending: false }).limit(20),
        (supabase as any).from("domiciliario_actividad").select("tipo, created_at").eq("domiciliario_id", auth.user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("notificaciones").select("id, titulo, cuerpo, leida, created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(15),
        (supabase as any).from("solicitudes_ayuda_domiciliarios").select("id, categoria, descripcion, estado, respuesta, created_at").eq("domiciliario_id", auth.user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      const error = [perfil, disponibles, asignados, ganancias, ranking, calificaciones, actividad, avisos, ayudas].find((r) => r.error)?.error;
      if (error) throw error;
      return {
        perfil: perfil.data ? { ...perfil.data, estado: perfil.data.estado as string } : null,
        disponibles: disponibles.data ?? [],
        asignados: asignados.data ?? [],
        total: (ganancias.data ?? []).reduce((sum, p) => sum + (p.pago_domiciliario ?? 0), 0),
        pendiente: (ganancias.data ?? []).filter((p) => !p.pago_domiciliario_liquidado).reduce((sum, p) => sum + (p.pago_domiciliario ?? 0), 0),
        pagado: (ganancias.data ?? []).filter((p) => p.pago_domiciliario_liquidado).reduce((sum, p) => sum + (p.pago_domiciliario ?? 0), 0),
        historial: ganancias.data ?? [], ranking: ranking.data, calificaciones: calificaciones.data ?? [],
        actividad: actividad.data ?? [], avisos: avisos.data ?? [], ayudas: ayudas.data ?? [],
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
  useEffect(() => {
    const channel = supabase.channel("portal-domi-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => qc.invalidateQueries({ queryKey: ["portal-domiciliario"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones" }, () => qc.invalidateQueries({ queryKey: ["portal-domiciliario"] }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
  const activo = d?.perfil?.estado === "activo";
  const puedeSolicitarReingreso = ["rechazado", "retirado", "suspendido"].includes(d?.perfil?.estado ?? "");
  const cambiarEstado = (id: string, estado: string) =>
    actualizar.mutate({ fn: "domiciliario_actualizar_estado", args: { _pedido_id: id, _estado: estado } });
  const registrarActividad = (tipo: string) => actualizar.mutate({ fn: "domiciliario_registrar_actividad", args: { _tipo: tipo } });
  const confirmarRecogida = (id: string) =>
    actualizar.mutate({ fn: "domiciliario_confirmar_recogida", args: { _pedido_id: id, _codigo: codigos[id] ?? "" } });

  return (
    <div className="min-h-screen bg-brand-mist">
      <Encabezado />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-brand-vivid">Zona de trabajo</p><h1 className="mt-1 font-display text-3xl font-bold text-foreground">Portal del domiciliario</h1><p className="mt-2 text-sm text-muted-foreground">Tus pedidos, entregas y ganancias en un solo lugar.</p>
            {d?.perfil?.numero != null && <p className="mt-2 inline-flex rounded-full bg-brand-lavender px-3 py-1 text-sm font-bold text-primary">Tu código: DOM-{String(d.perfil.numero).padStart(3, "0")}</p>}</div>
          {activo && <Button variant={d?.perfil?.disponible ? "outline" : "hero"} disabled={actualizar.isPending} onClick={() => { const siguiente = !d?.perfil?.disponible; actualizar.mutate({ fn: "domiciliario_disponibilidad", args: { _disponible: siguiente } }); registrarActividad(siguiente ? "reanudar" : "pausa"); }}><Power className="mr-2 size-4" />{d?.perfil?.disponible ? "Pausar disponibilidad" : "Estoy disponible"}</Button>}
        </div>
        {consulta.isLoading && <p className="mt-8 text-sm text-muted-foreground">Cargando tu información…</p>}
        {consulta.isError && <p role="alert" className="mt-6 rounded-xl bg-card p-4 text-sm text-destructive">No se pudo cargar el portal. Verifica que la base de datos esté actualizada y que tu cuenta esté registrada.</p>}
        {d?.perfil?.estado !== "activo" && <section className="mt-8 rounded-2xl border border-brand-lilac bg-card p-6"><Clock3 className="size-8 text-primary" /><h2 className="mt-3 text-xl font-bold text-foreground">{d?.perfil?.estado === "pendiente" ? "Solicitud en revisión" : d?.perfil?.estado === "rechazado" ? "Solicitud rechazada" : d?.perfil?.estado === "retirado" || d?.perfil?.estado === "suspendido" ? "Cuenta deshabilitada" : "Solicitud de domiciliario"}</h2><p className="mt-2 text-sm text-muted-foreground">{d?.perfil?.estado === "pendiente" ? "Tu solicitud está pendiente de revisión por la administración." : puedeSolicitarReingreso ? "Puedes enviar una nueva solicitud desde esta misma cuenta. La administración revisará nuevamente tu información antes de habilitarte." : "Tu cuenta todavía no está aprobada. Cuando la administración revise tus datos y confirme los requisitos aplicables, podrás activar tu disponibilidad y recibir pedidos."}</p><p className="mt-3 text-xs text-muted-foreground">Estado actual: {d?.perfil?.estado ?? "No hay solicitud registrada"}</p>{!d?.perfil && <Button className="mt-4" disabled={solicitarPostulacion.isPending} onClick={() => solicitarPostulacion.mutate()}>{solicitarPostulacion.isPending ? "Enviando..." : "Enviar mi postulación"}</Button>}{d?.perfil?.estado === "pendiente" && <Button variant="outline" className="mt-4" disabled={actualizar.isPending} onClick={() => { if (window.confirm("¿Quieres cancelar tu solicitud como domiciliario? Podrás volver a postularte más adelante.")) actualizar.mutate({ fn: "domiciliario_retirar_postulacion", args: {} }); }}>Cancelar mi solicitud</Button>}{puedeSolicitarReingreso && <Button className="mt-4" disabled={actualizar.isPending} onClick={() => actualizar.mutate({ fn: "domiciliario_solicitar_reingreso", args: {} })}>Enviar nueva postulación</Button>}</section>}
        {activo && <>
          <section className="mt-8 grid gap-4 sm:grid-cols-4">
            <Resumen icono={Wallet} titulo="Ganancias registradas" valor={formatearCOP(d?.total ?? 0)} />
            <Resumen icono={Wallet} titulo="Pendiente de liquidar" valor={formatearCOP(d?.pendiente ?? 0)} />
            <Resumen icono={PackageCheck} titulo="Pedidos en curso" valor={String(d?.asignados.length ?? 0)} /><Resumen icono={Wallet} titulo="Ya liquidado" valor={formatearCOP(d?.pagado ?? 0)} />
          </section>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <section className="mt-8"><h2 className="text-xl font-bold text-foreground">Pedidos disponibles</h2><p className="mt-1 text-sm text-muted-foreground">La lista se actualiza automáticamente. Solo puedes aceptar un pedido que siga libre.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {d?.disponibles.map((p) => <article key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft"><div className="flex justify-between gap-3"><strong>Pedido #{p.numero}</strong><strong>{formatearCOP(p.valor_domicilio ?? 0)}</strong></div><p className="mt-3 text-sm text-muted-foreground">Recogida: {p.recogida_direccion || "Por confirmar"}</p><p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />Entrega: {p.entrega_direccion}{p.entrega_barrio ? " · " + p.entrega_barrio : ""}</p><a href={enlaceMapa(p.entrega_direccion)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPin className="size-4" /> Ver destino en el mapa</a><Button className="mt-4 w-full" disabled={actualizar.isPending || !d.perfil?.disponible} onClick={() => actualizar.mutate({ fn: "domiciliario_aceptar_pedido", args: { _pedido_id: p.id } })}>Aceptar pedido</Button>{!d.perfil?.disponible && <p className="mt-2 text-xs text-muted-foreground">Activa tu disponibilidad para aceptar pedidos.</p>}</article>)}
              {d?.disponibles.length === 0 && <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">En este momento no hay pedidos disponibles.</p>}
            </div>
          </section>
          <section className="mt-8"><h2 className="text-xl font-bold text-foreground">Mis pedidos activos</h2><div className="mt-4 space-y-4">
            {d?.asignados.map((p) => { const siguiente: Record<string, string> = { asignado: "hacia_recogida", recogido: "hacia_entrega", hacia_entrega: "entregado" }; return <article key={p.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap justify-between gap-2"><strong>Pedido #{p.numero}</strong><span className="text-sm font-semibold text-primary">{ESTADOS[p.estado]}</span></div><p className="mt-2 text-sm">Cliente: {p.cliente_nombre} · <a className="font-semibold text-primary hover:underline" href={`tel:${p.cliente_telefono}`}>{p.cliente_telefono}</a></p><p className="mt-1 text-sm text-muted-foreground">Recoger: {p.recogida_direccion || "Según indicaciones del pedido"}</p><a href={enlaceMapa(p.recogida_direccion || "")} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPin className="size-4" /> Navegar al punto de recogida</a><p className="mt-2 text-sm text-muted-foreground">Entregar: {p.entrega_direccion}{p.entrega_barrio ? " · " + p.entrega_barrio : ""}</p><a href={enlaceMapa(p.entrega_direccion)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPin className="size-4" /> Navegar al destino</a>{p.estado === "hacia_recogida" ? <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input inputMode="numeric" maxLength={6} placeholder="Código de 6 dígitos del cliente" value={codigos[p.id] ?? ""} onChange={(e) => setCodigos((actual) => ({ ...actual, [p.id]: e.target.value.replace(/\\D/g, "").slice(0, 6) }))} /><Button disabled={actualizar.isPending || (codigos[p.id] ?? "").length !== 6} onClick={() => confirmarRecogida(p.id)}>Confirmar recogida</Button></div> : p.estado === "asignado" ? <Button className="mt-4" disabled={actualizar.isPending} onClick={() => cambiarEstado(p.id, siguiente[p.estado])}>Voy al punto de recogida</Button> : p.estado === "recogido" ? <Button className="mt-4" disabled={actualizar.isPending} onClick={() => cambiarEstado(p.id, siguiente[p.estado])}>Iniciar entrega al cliente</Button> : <Button className="mt-4" disabled={actualizar.isPending} onClick={() => cambiarEstado(p.id, siguiente[p.estado])}>Marcar como entregado</Button>}</article>; })}
            {d?.asignados.length === 0 && <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">Todavía no tienes pedidos asignados.</p>}
          </div></section>
        </>}
      </main>
    </div>
  );
}

function Resumen({ icono: Icono, titulo, valor }: { icono: typeof Wallet; titulo: string; valor: string }) {
  return <article className="rounded-2xl border border-border bg-card p-5 shadow-soft"><Icono className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{titulo}</p><p className="mt-1 font-display text-2xl font-bold text-foreground">{valor}</p></article>;
}
