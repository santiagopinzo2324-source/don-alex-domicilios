import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Activity, Bike, ClipboardList, Clock3, DollarSign, PackageCheck, LogOut, RefreshCw, Store, Users, MapPin, Plus, Save, Trash2, CheckCircle2, Bell, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

import { consultaSolicitudesKey, SolicitudesDomiciliarios } from "@/components/admin/SolicitudesDomiciliarios";
import { Encabezado } from "@/components/sitio/Encabezado";
import { supabase } from "@/integrations/supabase/client";
import { formatearCOP } from "@/lib/tarifas";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw redirect({ to: "/administracion" });
    const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (error || !roles?.some((r) => r.role === "admin")) throw redirect({ to: "/administracion" });
  },
  component: Admin,
});

async function cargarResumen() {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const desde = inicio.toISOString();

  const [pedidos, pendientes, curso, entregados, clientes, domiciliarios, negocios, ingresos] = await Promise.all([
    supabase.from("pedidos").select("id", { count: "exact", head: true }).gte("created_at", desde),
    supabase.from("pedidos").select("id", { count: "exact", head: true }).in("estado", ["recibido", "confirmado"]),
    supabase.from("pedidos").select("id", { count: "exact", head: true }).in("estado", ["asignado", "hacia_recogida", "recogido", "hacia_entrega", "en_preparacion", "listo"]),
    supabase.from("pedidos").select("id", { count: "exact", head: true }).in("estado", ["entregado", "finalizado"]).gte("created_at", desde),
    supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "cliente"),
    supabase.from("domiciliarios").select("user_id", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("establecimientos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("pedidos").select("valor_domicilio").gte("created_at", desde).in("estado", ["entregado", "finalizado"]),
  ]);
  const error = [pedidos, pendientes, curso, entregados, clientes, domiciliarios, negocios, ingresos].find((r) => r.error)?.error;
  if (error) throw error;
  const totalDomicilios = (ingresos.data ?? []).reduce((s, p) => s + (p.valor_domicilio ?? 0), 0);
  return {
    pedidos: pedidos.count ?? 0,
    pendientes: pendientes.count ?? 0,
    curso: curso.count ?? 0,
    entregados: entregados.count ?? 0,
    clientes: clientes.count ?? 0,
    domiciliarios: domiciliarios.count ?? 0,
    negocios: negocios.count ?? 0,
    totalDomicilios,
  };
}

type ReglaCobertura = { id: string; nombre: string; servicio_disponible: boolean; hora_limite: string | null; mensaje_cliente: string; activa: boolean; poligono: unknown };
async function cargarReglasCobertura() {
  const { data, error } = await supabase.from("reglas_cobertura").select("*").order("nombre");
  if (error) throw error;
  return data as ReglaCobertura[];
}


function AvisosAdministracion() {
  const [sonido, setSonido] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const avisos = useQuery({
    queryKey: ["admin-notificaciones"],
    enabled: !!usuarioId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("notificaciones")
        .select("id, titulo, cuerpo, leida, created_at, pedido_id")
        .eq("user_id", usuarioId!)
        .order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let activo = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!activo || !data.user) return;
      setUsuarioId(data.user.id);
      channel = supabase.channel("admin-notificaciones-live")
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notificaciones",
          filter: `user_id=eq.${data.user.id}`,
        }, () => {
          void avisos.refetch();
          if (sonido) {
            try {
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
              const ctx = new AudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(740, ctx.currentTime);
              gain.gain.setValueAtTime(0.0001, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.03);
              gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
              osc.connect(gain); gain.connect(ctx.destination);
              osc.start(); osc.stop(ctx.currentTime + 0.51);
              window.setTimeout(() => void ctx.close(), 700);
            } catch { /* El navegador puede bloquear el audio. */ }
          }
        }).subscribe();
    });
    return () => {
      activo = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sonido]);

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-bold"><Bell className="size-5 text-primary" /> Avisos de operación</h2><p className="mt-1 text-sm text-muted-foreground">Cancelaciones, novedades y notificaciones dirigidas a administración.</p></div>
        <Button size="sm" variant={sonido ? "outline" : "hero"} onClick={() => setSonido((v) => !v)}>{sonido ? <><VolumeX className="mr-2 size-4" /> Silenciar avisos</> : <><Volume2 className="mr-2 size-4" /> Activar sonido</>}</Button>
      </div>
      {avisos.isError && <p className="mt-3 text-sm text-destructive">No se pudieron consultar las notificaciones.</p>}
      <div className="mt-3 space-y-2">
        {avisos.data?.map((aviso) => <article key={aviso.id} className="rounded-xl bg-muted/50 p-3">
          <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{aviso.titulo}</strong><span className="text-xs text-muted-foreground">{new Date(aviso.created_at).toLocaleString("es-CO")}</span></div>
          {aviso.cuerpo && <p className="mt-1 text-sm text-muted-foreground">{aviso.cuerpo}</p>}
          {aviso.pedido_id && <p className="mt-1 text-xs text-primary">Pedido relacionado: {aviso.pedido_id.slice(0, 8).toUpperCase()}</p>}
        </article>)}
        {!avisos.isLoading && !avisos.data?.length && <p className="text-sm text-muted-foreground">No hay avisos nuevos.</p>}
      </div>
    </section>
  );
}

function PedidosPorConfirmar() {
  const qc = useQueryClient();
  const [tarifas, setTarifas] = useState<Record<string, string>>({});
  const pedidos = useQuery({
    queryKey: ["admin-pedidos-recibidos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pedidos")
        .select("id, numero, cliente_nombre, cliente_telefono, recogida_direccion, entrega_direccion, entrega_barrio, entrega_referencia, descripcion, observaciones, metodo_pago, created_at")
        .eq("estado", "recibido").order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });
  const confirmar = useMutation({
    mutationFn: async ({ id, tarifa }: { id: string; tarifa: number }) => {
      const { error } = await supabase.from("pedidos").update({
        estado: "confirmado", estado_tarifa: "ok", valor_domicilio: tarifa, total: tarifa,
      } as never).eq("id", id).eq("estado", "recibido");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido confirmado. Ya puede aparecer a los domiciliarios disponibles.");
      qc.invalidateQueries({ queryKey: ["admin-pedidos-recibidos"] });
      qc.invalidateQueries({ queryKey: ["admin-resumen"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo confirmar el pedido."),
  });
  return (
    <section className="mt-8 rounded-2xl border border-brand-lilac bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-foreground">Pedidos nuevos por revisar</h2><p className="mt-1 text-sm text-muted-foreground">Define la tarifa del domicilio y confirma cada solicitud para enviarla al módulo de domiciliarios.</p></div><span className="rounded-full bg-brand-lavender px-3 py-1 text-sm font-semibold text-primary">{pedidos.data?.length ?? 0} pendientes</span></div>
      {pedidos.isError && <p className="mt-4 text-sm text-destructive">No se pudieron cargar los pedidos nuevos.</p>}
      {pedidos.isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando pedidos…</p>}
      {!pedidos.isLoading && pedidos.data?.length === 0 && <p className="mt-4 rounded-xl bg-brand-mist p-4 text-sm text-muted-foreground">No hay pedidos nuevos por revisar.</p>}
      <div className="mt-4 space-y-3">
        {pedidos.data?.map((p) => <article key={p.id} className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">Pedido #{p.numero} · {p.cliente_nombre}</h3><span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("es-CO")}</span></div>
          <p className="mt-1 text-sm text-muted-foreground">Celular: {p.cliente_telefono} · Pago: {p.metodo_pago ?? "Por definir"}</p>
          {p.recogida_direccion && <p className="mt-2 text-sm"><strong>Recoger:</strong> {p.recogida_direccion}</p>}
          <p className="mt-1 text-sm"><strong>Entregar:</strong> {p.entrega_direccion}{p.entrega_barrio ? " · " + p.entrega_barrio : ""}</p>
          {p.entrega_referencia && <p className="text-sm"><strong>Referencia:</strong> {p.entrega_referencia}</p>}
          {p.descripcion && <p className="mt-1 text-sm"><strong>Detalle:</strong> {p.descripcion}</p>}
          {p.observaciones && <p className="text-sm"><strong>Indicaciones:</strong> {p.observaciones}</p>}
          <div className="mt-3 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Valor del domicilio (COP)<input type="number" min="1" step="500" value={tarifas[p.id] ?? ""} onChange={(e) => setTarifas((v) => ({ ...v, [p.id]: e.target.value }))} placeholder="Ej. 6000" className="mt-1 block h-10 w-44 rounded-lg border border-input bg-background px-3 font-normal" /></label><button disabled={confirmar.isPending || !Number.isInteger(Number(tarifas[p.id])) || Number(tarifas[p.id]) <= 0} onClick={() => confirmar.mutate({ id: p.id, tarifa: Number(tarifas[p.id]) })} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><CheckCircle2 className="size-4" /> Confirmar pedido</button></div>
        </article>)}
      </div>
    </section>
  );
}


function OperacionesDespacho() {
  const qc = useQueryClient();
  const datos = useQuery({
    queryKey: ["admin-despacho-operativo"], refetchInterval: 10000,
    queryFn: async () => {
      const [domis, pedidos] = await Promise.all([
        (supabase as any).from("domiciliarios").select("user_id, numero, disponible").eq("estado", "activo").eq("disponible", true).order("created_at", { ascending: true }),
        supabase.from("pedidos").select("id, numero, cliente_nombre, entrega_direccion, estado").is("domiciliario_id", null).in("estado", ["confirmado", "listo"]).order("created_at", { ascending: true }),
      ]);
      if (domis.error) throw domis.error;
      if (pedidos.error) throw pedidos.error;
      const ids = (domis.data ?? []).map((d: { user_id: string }) => d.user_id);
      const perfiles = ids.length ? await supabase.from("profiles").select("id, nombre_completo").in("id", ids) : { data: [], error: null };
      if (perfiles.error) throw perfiles.error;
      return { domiciliarios: (domis.data ?? []).map((d: any) => ({ ...d, perfil: perfiles.data?.find((p) => p.id === d.user_id) })), pedidos: pedidos.data ?? [] };
    },
  });
  const cerrar = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("admin_marcar_pedido_entregado" as never, { _pedido_id: id } as never); if (error) throw error; },
    onSuccess: () => { toast.success("Pedido cerrado como entregado."); qc.invalidateQueries({ queryKey: ["admin-despacho-operativo"] }); qc.invalidateQueries({ queryKey: ["admin-resumen"] }); },
    onError: (e: Error) => toast.error(e.message || "No se pudo cerrar el pedido."),
  });
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="text-xl font-bold">Despacho y disponibilidad en tiempo real</h2>
      <p className="mt-1 text-sm text-muted-foreground">Solo se cuentan domiciliarios aprobados que marcaron disponibilidad. Los pedidos se ofrecen por turnos; si no hay personal disponible, puedes coordinar un domiciliario externo o cerrar el pedido.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-brand-mist p-4"><h3 className="font-semibold">Domiciliarios disponibles ({datos.data?.domiciliarios.length ?? 0})</h3><div className="mt-2 space-y-2">{datos.data?.domiciliarios.map((d: any) => <div key={d.user_id} className="flex justify-between gap-2 rounded-lg bg-card p-3 text-sm"><span>{d.perfil?.nombre_completo || "Domiciliario"} · DOM-{String(d.numero ?? 0).padStart(3,"0")}</span><strong className="text-primary">Disponible</strong></div>)}{!datos.data?.domiciliarios.length && <p className="text-sm text-muted-foreground">No hay domiciliarios disponibles ahora.</p>}</div></div>
        <div className="rounded-xl bg-brand-mist p-4"><h3 className="font-semibold">Pedidos sin asignar ({datos.data?.pedidos.length ?? 0})</h3><div className="mt-2 space-y-2">{datos.data?.pedidos.map((p) => <article key={p.id} className="rounded-lg bg-card p-3 text-sm"><div className="flex justify-between gap-2"><strong>Pedido #{p.numero} · {p.cliente_nombre}</strong><span>{p.estado}</span></div><p className="mt-1 text-muted-foreground">{p.entrega_direccion}</p><Button className="mt-3" size="sm" variant="outline" disabled={cerrar.isPending} onClick={() => { if (window.confirm("¿Confirmas que este pedido fue entregado por un domiciliario externo o por fuera del sistema? Se cerrará y pasará al historial.")) cerrar.mutate(p.id); }}>Marcar como entregado</Button></article>)}{!datos.data?.pedidos.length && <p className="text-sm text-muted-foreground">No hay pedidos esperando asignación.</p>}</div></div>
      </div>
    </section>
  );
}

function Admin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const cerrarSesion = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/administracion", replace: true });
  };
  const resumen = useQuery({ queryKey: ["admin-resumen"], queryFn: cargarResumen, refetchInterval: 30000 });
  const reglas = useQuery({ queryKey: ["admin-reglas-cobertura"], queryFn: cargarReglasCobertura });
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("bloqueada");
  const [nuevoLimite, setNuevoLimite] = useState("17:30");
  const [nuevoMensaje, setNuevoMensaje] = useState("Por el momento no contamos con cobertura de domicilios en este sector.");
  const [ediciones, setEdiciones] = useState<Record<string, Partial<ReglaCobertura>>>({});
  const guardarRegla = useMutation({
    mutationFn: async (regla: ReglaCobertura) => {
      const { error } = await supabase.from("reglas_cobertura").update((ediciones[regla.id] ?? {}) as never).eq("id", regla.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Regla guardada."); qc.invalidateQueries({ queryKey: ["admin-reglas-cobertura"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const crearRegla = useMutation({
    mutationFn: async () => {
      if (!nuevoNombre.trim()) throw new Error("Escribe el nombre del sector.");
      const { error } = await supabase.from("reglas_cobertura").insert({
        nombre: nuevoNombre.trim(), servicio_disponible: nuevoTipo !== "bloqueada",
        hora_limite: nuevoTipo === "horario" ? nuevoLimite : null,
        mensaje_cliente: nuevoMensaje.trim(), activa: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sector agregado."); setNuevoNombre(""); qc.invalidateQueries({ queryKey: ["admin-reglas-cobertura"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const eliminarRegla = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reglas_cobertura").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Regla eliminada."); qc.invalidateQueries({ queryKey: ["admin-reglas-cobertura"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const cambiarContrasena = async () => {
    if (claveNueva.length < 10) { toast.error("La nueva contraseña debe tener al menos 10 caracteres."); return; }
    if (claveNueva !== confirmarClave) { toast.error("Las contraseñas nuevas no coinciden."); return; }
    setCambiandoClave(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error("Tu sesión terminó. Ingresa nuevamente.");
      const projectUrl = "https://rnamhjkwbygmzwyjredd.supabase.co";
      const publishableKey = "sb_publishable_JUWjIGGskjjpZYnwsN4wmA_epAOd6bW";
      const response = await fetch(projectUrl.replace(/\/+$/, "") + "/functions/v1/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: publishableKey, Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ action: "change_password", current_password: claveActual, new_password: claveNueva }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo cambiar la contraseña.");
      setClaveActual(""); setClaveNueva(""); setConfirmarClave("");
      toast.success("Contraseña actualizada. Usa la nueva la próxima vez que ingreses.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cambiar la contraseña."); }
    finally { setCambiandoClave(false); }
  };

  const tarjetas = [
    { nombre: "Pedidos de hoy", valor: resumen.data?.pedidos, icono: ClipboardList },
    { nombre: "Pendientes", valor: resumen.data?.pendientes, icono: Clock3 },
    { nombre: "En curso", valor: resumen.data?.curso, icono: Activity },
    { nombre: "Entregados hoy", valor: resumen.data?.entregados, icono: PackageCheck },
    { nombre: "Clientes", valor: resumen.data?.clientes, icono: Users },
    { nombre: "Domiciliarios activos", valor: resumen.data?.domiciliarios, icono: Bike },
    { nombre: "Negocios activos", valor: resumen.data?.negocios, icono: Store },
  ];

  return (
    <div className="min-h-screen bg-brand-mist">
      <Encabezado />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-vivid">Centro de operaciones</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Administración Don Alex</h1>
            <p className="mt-2 text-sm text-muted-foreground">Resumen conectado a los registros de la plataforma.</p>
          </div>
          <div className="flex flex-wrap gap-2">
          <button onClick={() => { resumen.refetch(); qc.invalidateQueries({ queryKey: consultaSolicitudesKey }); }} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-brand-lilac">
            <RefreshCw className="size-4" /> Actualizar
          </button>
          <button onClick={cerrarSesion} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-brand-lilac">
            <LogOut className="size-4" /> Cerrar sesión
          </button>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-bold text-foreground">Seguridad de la cuenta</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cambia tu contraseña de administración. Usa una clave de al menos 10 caracteres.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input type="password" autoComplete="current-password" value={claveActual} onChange={(e) => setClaveActual(e.target.value)} placeholder="Contraseña actual" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input type="password" autoComplete="new-password" value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} placeholder="Nueva contraseña (mín. 10)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input type="password" autoComplete="new-password" value={confirmarClave} onChange={(e) => setConfirmarClave(e.target.value)} placeholder="Repite la nueva contraseña" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <button type="button" disabled={cambiandoClave || !claveActual || !claveNueva || !confirmarClave} onClick={cambiarContrasena} className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{cambiandoClave ? "Actualizando..." : "Cambiar contraseña"}</button>
        </section>

        {resumen.isError && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No fue posible consultar el resumen. Verifica que la migración de base de datos esté aplicada y que tu usuario tenga rol de administrador.</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tarjetas.map(({ nombre, valor, icono: Icono }) => (
            <article key={nombre} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{nombre}</p>
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-lavender text-primary"><Icono className="size-5" /></span>
              </div>
              <p className="mt-4 font-display text-3xl font-bold tabular-nums text-foreground">{resumen.isLoading ? "—" : (valor ?? 0).toLocaleString("es-CO")}</p>
            </article>
          ))}
          <article className="rounded-2xl border border-brand-lilac bg-gradient-brand p-5 text-on-brand shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-on-brand-muted">Domicilios cobrados hoy</p>
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/15"><DollarSign className="size-5" /></span>
            </div>
            <p className="mt-4 font-display text-3xl font-bold tabular-nums">{resumen.isLoading ? "—" : formatearCOP(resumen.data?.totalDomicilios ?? 0)}</p>
            <p className="mt-2 text-xs text-on-brand-muted">Suma de tarifas de pedidos entregados o finalizados, no equivale a utilidad neta.</p>
          </article>
        </section>

        <AvisosAdministracion />\n        <SolicitudesDomiciliarios />
        <PedidosPorConfirmar />
        <OperacionesDespacho />
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-brand-lavender text-primary"><MapPin className="size-5" /></span><div><h2 className="text-xl font-bold text-foreground">Cobertura y horarios por sector</h2><p className="mt-1 text-sm text-muted-foreground">Administra las reglas y avisos. Los polígonos geográficos aún deben delimitarse con datos verificados.</p></div></div>
          {reglas.isError && <p role="alert" className="mt-4 text-sm text-destructive">No se pudieron cargar las reglas.</p>}
          <div className="mt-5 space-y-4">
            {reglas.data?.map((regla) => { const edit = ediciones[regla.id] ?? {}; return <article key={regla.id} className="rounded-xl border border-border p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold">Sector<input className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal" value={edit.nombre ?? regla.nombre} onChange={(e) => setEdiciones((v) => ({ ...v, [regla.id]: { ...v[regla.id], nombre: e.target.value } }))} /></label>
                <label className="text-sm font-semibold">Hora límite (opcional)<input type="time" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal" value={(edit.hora_limite ?? regla.hora_limite ?? "").slice(0,5)} onChange={(e) => setEdiciones((v) => ({ ...v, [regla.id]: { ...v[regla.id], hora_limite: e.target.value || null } }))} /></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.servicio_disponible ?? regla.servicio_disponible} onChange={(e) => setEdiciones((v) => ({ ...v, [regla.id]: { ...v[regla.id], servicio_disponible: e.target.checked } }))} /> Permitir domicilios</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.activa ?? regla.activa} onChange={(e) => setEdiciones((v) => ({ ...v, [regla.id]: { ...v[regla.id], activa: e.target.checked } }))} /> Regla activa</label>
              </div>
              <label className="mt-3 block text-sm font-semibold">Mensaje para el cliente<textarea rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal" value={edit.mensaje_cliente ?? regla.mensaje_cliente} onChange={(e) => setEdiciones((v) => ({ ...v, [regla.id]: { ...v[regla.id], mensaje_cliente: e.target.value } }))} /></label>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => eliminarRegla.mutate(regla.id)} disabled={eliminarRegla.isPending} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><Trash2 className="size-4" /> Eliminar</button>
                <button onClick={() => guardarRegla.mutate(regla)} disabled={guardarRegla.isPending || !Object.keys(edit).length} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save className="size-4" /> Guardar</button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Delimitación en mapa: {Array.isArray(regla.poligono) && regla.poligono.length >= 3 ? "configurada" : "pendiente"}</p>
            </article>; })}
          </div>
          <div className="mt-6 rounded-xl bg-brand-mist p-4"><h3 className="font-semibold">Agregar otro sector</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del barrio o sector" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="bloqueada">Sin cobertura</option><option value="horario">Con hora límite</option><option value="normal">Cobertura normal</option></select>
              {nuevoTipo === "horario" && <input type="time" value={nuevoLimite} onChange={(e) => setNuevoLimite(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />}
              <textarea rows={2} value={nuevoMensaje} onChange={(e) => setNuevoMensaje(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <button onClick={() => crearRegla.mutate()} disabled={crearRegla.isPending || !nuevoNombre.trim()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Agregar sector</button>
          </div>
        </section>
      </main>
    </div>
  );
}
