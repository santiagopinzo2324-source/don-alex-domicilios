import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Clock3, MapPin, PackageCheck, Power, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Encabezado } from "@/components/sitio/Encabezado";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatearCOP } from "@/lib/tarifas";

export const Route = createFileRoute("/_authenticated/domiciliario")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
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
  const qc = useQueryClient();
  const consulta = useQuery({
    queryKey: ["portal-domiciliario"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Inicia sesión.");
      const [perfil, disponibles, asignados, ganancias] = await Promise.all([
        supabase.from("domiciliarios").select("estado, disponible, numero").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("pedidos").select("id, numero, cliente_nombre, cliente_telefono, recogida_direccion, entrega_direccion, entrega_barrio, valor_domicilio, estado, created_at").is("domiciliario_id", null).in("estado", ["listo", "confirmado"]).order("created_at", { ascending: true }).limit(20),
        supabase.from("pedidos").select("id, numero, cliente_nombre, cliente_telefono, recogida_direccion, entrega_direccion, entrega_barrio, valor_domicilio, estado").eq("domiciliario_id", auth.user.id).in("estado", ["asignado", "hacia_recogida", "recogido", "hacia_entrega"]).order("asignado_at", { ascending: false }),
        supabase.from("pedidos").select("pago_domiciliario, pago_domiciliario_liquidado").eq("domiciliario_id", auth.user.id).in("estado", ["entregado", "finalizado"]),
      ]);
      const error = [perfil, disponibles, asignados, ganancias].find((r) => r.error)?.error;
      if (error) throw error;
      return {
        perfil: perfil.data,
        disponibles: disponibles.data ?? [],
        asignados: asignados.data ?? [],
        total: (ganancias.data ?? []).reduce((sum, p) => sum + (p.pago_domiciliario ?? 0), 0),
        pendiente: (ganancias.data ?? []).filter((p) => !p.pago_domiciliario_liquidado).reduce((sum, p) => sum + (p.pago_domiciliario ?? 0), 0),
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

  const d = consulta.data;
  const activo = d?.perfil?.estado === "activo";
  const cambiarEstado = (id: string, estado: string) =>
    actualizar.mutate({ fn: "domiciliario_actualizar_estado", args: { _pedido_id: id, _estado: estado } });

  return (
    <div className="min-h-screen bg-brand-mist">
      <Encabezado />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-brand-vivid">Zona de trabajo</p><h1 className="mt-1 font-display text-3xl font-bold text-foreground">Portal del domiciliario</h1><p className="mt-2 text-sm text-muted-foreground">Tus pedidos, entregas y ganancias en un solo lugar.</p>
            {d?.perfil?.numero != null && <p className="mt-2 inline-flex rounded-full bg-brand-lavender px-3 py-1 text-sm font-bold text-primary">Tu código: DOM-{String(d.perfil.numero).padStart(3, "0")}</p>}</div>
          {activo && <Button variant={d?.perfil?.disponible ? "outline" : "hero"} disabled={actualizar.isPending} onClick={() => actualizar.mutate({ fn: "domiciliario_disponibilidad", args: { _disponible: !d?.perfil?.disponible } })}><Power className="mr-2 size-4" />{d?.perfil?.disponible ? "Pausar disponibilidad" : "Estoy disponible"}</Button>}
        </div>
        {consulta.isLoading && <p className="mt-8 text-sm text-muted-foreground">Cargando tu información…</p>}
        {consulta.isError && <p role="alert" className="mt-6 rounded-xl bg-card p-4 text-sm text-destructive">No se pudo cargar el portal. Verifica que la base de datos esté actualizada y que tu cuenta esté registrada.</p>}
        {d?.perfil?.estado !== "activo" && <section className="mt-8 rounded-2xl border border-brand-lilac bg-card p-6"><Clock3 className="size-8 text-primary" /><h2 className="mt-3 text-xl font-bold text-foreground">Solicitud en revisión</h2><p className="mt-2 text-sm text-muted-foreground">Tu cuenta de domiciliario todavía no está aprobada por Don Alex. Cuando el administrador revise tus datos y confirme los requisitos aplicables, podrás activar tu disponibilidad y recibir pedidos.</p><p className="mt-3 text-xs text-muted-foreground">Estado actual: {d?.perfil?.estado ?? "No hay solicitud registrada"}</p></section>}
        {activo && <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <Resumen icono={Wallet} titulo="Ganancias registradas" valor={formatearCOP(d?.total ?? 0)} />
            <Resumen icono={Wallet} titulo="Pendiente de liquidar" valor={formatearCOP(d?.pendiente ?? 0)} />
            <Resumen icono={PackageCheck} titulo="Pedidos en curso" valor={String(d?.asignados.length ?? 0)} />
          </section>
          <section className="mt-8"><h2 className="text-xl font-bold text-foreground">Pedidos disponibles</h2><p className="mt-1 text-sm text-muted-foreground">La lista se actualiza automáticamente. Solo puedes aceptar un pedido que siga libre.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {d?.disponibles.map((p) => <article key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft"><div className="flex justify-between gap-3"><strong>Pedido #{p.numero}</strong><strong>{formatearCOP(p.valor_domicilio ?? 0)}</strong></div><p className="mt-3 text-sm text-muted-foreground">Recogida: {p.recogida_direccion || "Por confirmar"}</p><p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />Entrega: {p.entrega_direccion}{p.entrega_barrio ? " · " + p.entrega_barrio : ""}</p><a href={enlaceMapa(p.entrega_direccion)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPin className="size-4" /> Ver destino en el mapa</a><Button className="mt-4 w-full" disabled={actualizar.isPending || !d.perfil?.disponible} onClick={() => actualizar.mutate({ fn: "domiciliario_aceptar_pedido", args: { _pedido_id: p.id } })}>Aceptar pedido</Button>{!d.perfil?.disponible && <p className="mt-2 text-xs text-muted-foreground">Activa tu disponibilidad para aceptar pedidos.</p>}</article>)}
              {d?.disponibles.length === 0 && <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">En este momento no hay pedidos disponibles.</p>}
            </div>
          </section>
          <section className="mt-8"><h2 className="text-xl font-bold text-foreground">Mis pedidos activos</h2><div className="mt-4 space-y-4">
            {d?.asignados.map((p) => { const siguiente: Record<string, string> = { asignado: "hacia_recogida", hacia_recogida: "recogido", recogido: "hacia_entrega", hacia_entrega: "entregado" }; return <article key={p.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap justify-between gap-2"><strong>Pedido #{p.numero}</strong><span className="text-sm font-semibold text-primary">{ESTADOS[p.estado]}</span></div><p className="mt-2 text-sm">Cliente: {p.cliente_nombre} · <a className="font-semibold text-primary hover:underline" href={`tel:${p.cliente_telefono}`}>{p.cliente_telefono}</a></p><p className="mt-1 text-sm text-muted-foreground">Recoger: {p.recogida_direccion || "Según indicaciones del pedido"}</p><a href={enlaceMapa(p.recogida_direccion || "")} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPin className="size-4" /> Navegar al punto de recogida</a><p className="mt-2 text-sm text-muted-foreground">Entregar: {p.entrega_direccion}{p.entrega_barrio ? " · " + p.entrega_barrio : ""}</p><a href={enlaceMapa(p.entrega_direccion)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPin className="size-4" /> Navegar al destino</a><Button className="mt-4" disabled={actualizar.isPending} onClick={() => cambiarEstado(p.id, siguiente[p.estado])}>{p.estado === "hacia_entrega" ? "Marcar como entregado" : "Actualizar estado"}</Button></article>; })}
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
