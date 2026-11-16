import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bike, ClipboardList, Clock3, DollarSign, PackageCheck, RefreshCw, Store, Users, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Encabezado } from "@/components/sitio/Encabezado";
import { supabase } from "@/integrations/supabase/client";
import { formatearCOP } from "@/lib/tarifas";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw redirect({ to: "/auth" });
    const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (error || !roles?.some((r) => r.role === "admin")) throw redirect({ to: "/" });
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

async function cargarSolicitudes() {
  const { data: solicitudes, error } = await supabase
    .from("domiciliarios")
    .select("user_id, estado, created_at")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const ids = (solicitudes ?? []).map((s) => s.user_id);
  if (ids.length === 0) return [];
  const { data: perfiles, error: perfilError } = await supabase
    .from("profiles")
    .select("id, nombre_completo, telefono")
    .in("id", ids);
  if (perfilError) throw perfilError;
  return (solicitudes ?? []).map((s) => ({
    ...s,
    perfil: perfiles?.find((p) => p.id === s.user_id) ?? null,
  }));
}

function Admin() {
  const qc = useQueryClient();
  const resumen = useQuery({ queryKey: ["admin-resumen"], queryFn: cargarResumen, refetchInterval: 30000 });
  const solicitudes = useQuery({ queryKey: ["admin-solicitudes-domiciliarios"], queryFn: cargarSolicitudes, refetchInterval: 30000 });
  const revisar = useMutation({
    mutationFn: async ({ userId, aprobar }: { userId: string; aprobar: boolean }) => {
      const { error } = await supabase.rpc("admin_revisar_domiciliario", { _user_id: userId, _aprobar: aprobar });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.aprobar ? "Domiciliario aprobado." : "Solicitud rechazada.");
      qc.invalidateQueries({ queryKey: ["admin-solicitudes-domiciliarios"] });
      qc.invalidateQueries({ queryKey: ["admin-resumen"] });
    },
    onError: (error: Error) => toast.error(error.message || "No se pudo revisar la solicitud."),
  });

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
          <button onClick={() => { resumen.refetch(); solicitudes.refetch(); }} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-brand-lilac">
            <RefreshCw className="size-4" /> Actualizar
          </button>
        </div>

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

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold text-foreground">Solicitudes de domiciliarios</h2><p className="mt-1 text-sm text-muted-foreground">Revisa la información y confirma los requisitos aplicables antes de habilitar una cuenta.</p></div>
            <span className="rounded-full bg-brand-lavender px-3 py-1 text-sm font-semibold text-primary">{solicitudes.data?.length ?? 0} pendientes</span>
          </div>
          {solicitudes.isError && <p role="alert" className="mt-4 text-sm text-destructive">No se pudieron cargar las solicitudes. Comprueba que la migración del portal esté aplicada.</p>}
          {solicitudes.isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando solicitudes…</p>}
          {!solicitudes.isLoading && !solicitudes.isError && solicitudes.data?.length === 0 && <p className="mt-4 rounded-xl bg-brand-mist p-4 text-sm text-muted-foreground">No hay solicitudes pendientes por ahora.</p>}
          <div className="mt-4 space-y-3">
            {solicitudes.data?.map((s) => (
              <article key={s.user_id} className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{s.perfil?.nombre_completo || "Nombre no registrado"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.perfil?.telefono || "Teléfono no registrado"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Solicitud: {new Date(s.created_at).toLocaleDateString("es-CO")} · Estado: {s.estado}</p>
                  <p className="mt-1 text-xs text-muted-foreground">ID de cuenta: {s.user_id}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={revisar.isPending} onClick={() => revisar.mutate({ userId: s.user_id, aprobar: false })} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-50"><XCircle className="size-4" /> Rechazar</button>
                  <button disabled={revisar.isPending} onClick={() => revisar.mutate({ userId: s.user_id, aprobar: true })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><CheckCircle2 className="size-4" /> Aprobar</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
