import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bike, ClipboardList, Clock3, DollarSign, PackageCheck, RefreshCw, Store, Users } from "lucide-react";

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

function Admin() {
  const resumen = useQuery({ queryKey: ["admin-resumen"], queryFn: cargarResumen, refetchInterval: 30000 });
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
          <button onClick={() => resumen.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-brand-lilac">
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
          <h2 className="text-lg font-bold text-foreground">Siguiente control operativo</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Este primer panel muestra indicadores reales de la base de datos. La gestión detallada de pedidos, asignación de domiciliarios, aprobación de negocios, liquidaciones, mapas y reportes se desarrollará en las siguientes etapas; no se presentan aquí como funciones terminadas.</p>
        </section>
      </main>
    </div>
  );
}
