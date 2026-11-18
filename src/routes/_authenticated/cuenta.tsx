import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bike, Clock3, Home, LogOut, MapPin, MessageCircle, Package, RefreshCw, Star, Store, Trash2, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Encabezado } from "@/components/sitio/Encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { esquemaCelular, esquemaDireccion } from "@/lib/validacion";

const NOMBRE_ROL = { admin: "Administrador", cliente: "Cliente", domiciliario: "Domiciliario", restaurante: "Negocio" } as const;

const cuentaQuery = queryOptions({
  queryKey: ["cuenta"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Sin sesión");
    const [perfil, roles, direcciones, pedidos, notificaciones, codigos] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("direcciones").select("*").eq("cliente_id", u.user.id).order("es_principal", { ascending: false }).order("created_at"),
      supabase.from("pedidos").select("id, numero, tipo_servicio, estado, cliente_nombre, cliente_telefono, establecimiento_nombre, entrega_direccion, entrega_barrio, descripcion, observaciones, subtotal_productos, valor_domicilio, total, metodo_pago, created_at, updated_at").eq("cliente_id", u.user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("notificaciones").select("id, titulo, cuerpo, leida, created_at, pedido_id").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("codigos_recogida").select("pedido_id, codigo").eq("cliente_id", u.user.id),
    ]);
    if (perfil.error) throw perfil.error;
    if (roles.error) throw roles.error;
    if (direcciones.error) throw direcciones.error;
    if (pedidos.error) throw pedidos.error;
    if (notificaciones.error) throw notificaciones.error;
    if (codigos.error) throw codigos.error;
    return {
      email: u.user.email ?? "",
      userId: u.user.id,
      perfil: perfil.data,
      roles: (roles.data ?? []).map((r) => r.role),
      direcciones: direcciones.data ?? [],
      pedidos: pedidos.data ?? [],
      notificaciones: notificaciones.data ?? [],
      codigos: codigos.data ?? [],
    };
  },
});

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta · Don Alex Domicilios" },
      { name: "description", content: "Tus datos, direcciones y accesos en Don Alex." },
      { property: "og:title", content: "Mi cuenta · Don Alex" },
      { property: "og:description", content: "Administra tu perfil y direcciones de entrega." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(cuentaQuery),
  component: Cuenta,
});

function Cuenta() {
  const { data } = useSuspenseQuery(cuentaQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function salir() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const solicitud = data.perfil?.tipo_cuenta_solicitada;
  const solicitudPendiente = solicitud && solicitud !== "cliente" && !data.roles.includes(solicitud);

  return (
    <div className="min-h-screen bg-brand-mist">
      <Encabezado />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-brand-vivid">Mi cuenta</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
              ¡Hola, {data.perfil?.nombre_completo?.split(" ")[0] || "bienvenido"}! 💜
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.roles.map((r) => (
                <Badge key={r} className="rounded-full bg-brand-lavender text-brand-deep hover:bg-brand-lavender">{NOMBRE_ROL[r]}</Badge>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={salir}><LogOut /> Cerrar sesión</Button>
        </div>

        {solicitudPendiente && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-lilac bg-card p-5 shadow-soft">
            {solicitud === "domiciliario" ? <Bike className="mt-0.5 size-5 text-primary" /> : <Store className="mt-0.5 size-5 text-primary" />}
            <p className="text-sm text-muted-foreground">
              Tu solicitud para ser <strong className="text-foreground">{NOMBRE_ROL[solicitud]}</strong> está en revisión. Te avisaremos cuando un administrador la apruebe.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <FormPerfil userId={data.userId} email={data.email} nombre={data.perfil?.nombre_completo ?? ""} telefono={data.perfil?.telefono ?? ""} />
          <Direcciones userId={data.userId} direcciones={data.direcciones} onCambio={() => qc.invalidateQueries({ queryKey: ["cuenta"] })} />
        </div>
        <div className="mt-6 space-y-6">
          <NotificacionesCliente notificaciones={data.notificaciones} onCambio={() => qc.invalidateQueries({ queryKey: ["cuenta"] })} />
          <PedidosCliente pedidos={data.pedidos} codigos={data.codigos} />
        </div>
      </main>
    </div>
  );
}


type PedidoCliente = {
  id: string; numero: number; tipo_servicio: string; estado: string; cliente_nombre: string;
  establecimiento_nombre: string | null; entrega_direccion: string; entrega_barrio: string | null;
  descripcion: string | null; observaciones: string | null; subtotal_productos: number;
  valor_domicilio: number | null; total: number; metodo_pago: string | null; created_at: string;
};
type NotificacionCliente = { id: string; titulo: string; cuerpo: string | null; leida: boolean; created_at: string; pedido_id: string | null };

const ESTADOS_PEDIDO: Record<string, string> = {
  recibido: "Pedido recibido", confirmado: "Confirmado", en_preparacion: "En preparación",
  listo: "Listo para recoger", asignado: "Domiciliario asignado", hacia_recogida: "En camino al establecimiento",
  recogido: "Pedido recogido", hacia_entrega: "En camino a tu dirección", entregado: "Entregado",
  finalizado: "Finalizado", cancelado: "Cancelado",
};
const dinero = (valor: number | null) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor ?? 0);

function PedidosCliente({ pedidos, codigos }: { pedidos: PedidoCliente[]; codigos: { pedido_id: string; codigo: string | null }[] }) {
  const activos = pedidos.filter((p) => !["finalizado", "cancelado"].includes(p.estado));
  const cancelar = useMutation({
    mutationFn: async (pedidoId: string) => {
      const { error } = await supabase.rpc("cliente_solicitar_cancelacion" as never, { _pedido_id: pedidoId, _motivo: "Cancelación solicitada por el cliente" } as never);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Tu solicitud de cancelación fue enviada."),
    onError: (e: Error) => toast.error(e.message || "No se pudo solicitar la cancelación."),
  });
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Package className="size-5 text-primary" /> Mis pedidos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Consulta el estado y revisa tus domicilios anteriores.</p></div>
        <Badge className="rounded-full bg-brand-lavender text-brand-deep">{activos.length} activos</Badge>
      </div>
      {pedidos.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-brand-mist p-5 text-sm text-muted-foreground">Todavía no tienes pedidos asociados a esta cuenta. Cuando realices uno con tu sesión iniciada, aparecerá aquí.</div>
      ) : (
        <div className="mt-5 space-y-4">
          {pedidos.map((p) => {
            const texto = [
              "Hola, quiero consultar o repetir el pedido #" + p.numero + ".",
              p.descripcion ? "Detalle: " + p.descripcion : "",
              "Dirección: " + p.entrega_direccion,
            ].filter(Boolean).join(" ");
            const repetir = "https://wa.me/573118199006?text=" + encodeURIComponent(texto);
            return (
              <article key={p.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-bold text-foreground">Pedido #{p.numero}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</p></div>
                  <Badge className="rounded-full bg-brand-lavender text-brand-deep">{ESTADOS_PEDIDO[p.estado] ?? p.estado}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Servicio:</span> {p.tipo_servicio}</p>
                  {p.establecimiento_nombre && <p><span className="text-muted-foreground">Negocio:</span> {p.establecimiento_nombre}</p>}
                  <p className="sm:col-span-2"><span className="text-muted-foreground">Entrega:</span> {p.entrega_direccion}{p.entrega_barrio ? " · " + p.entrega_barrio : ""}</p>
                  {p.descripcion && <p className="sm:col-span-2"><span className="text-muted-foreground">Detalle:</span> {p.descripcion}</p>}
                  {["asignado", "hacia_recogida"].includes(p.estado) && codigos.find((c) => c.pedido_id === p.id)?.codigo && <p className="sm:col-span-2 rounded-xl bg-brand-lavender p-3 font-semibold text-brand-deep">Código de recogida: {codigos.find((c) => c.pedido_id === p.id)?.codigo} · Compártelo únicamente cuando el domiciliario llegue al punto de recogida.</p>}
                  {["recogido", "hacia_entrega"].includes(p.estado) && <p className="sm:col-span-2 text-sm font-medium text-primary">El pedido ya fue recogido. Cualquier cancelación requiere revisión de administración.</p>}
                  <p className="font-semibold sm:col-span-2">Total: {dinero(p.total)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={repetir} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-brand-mist"><RefreshCw className="size-4" /> Consultar o volver a pedir</a>
                  <a href="https://wa.me/573118199006" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-brand-lavender px-3 py-2 text-sm font-medium text-brand-deep"><MessageCircle className="size-4" /> Ayuda</a>
                  {!["entregado", "finalizado", "cancelado"].includes(p.estado) && <Button size="sm" variant="outline" disabled={cancelar.isPending} onClick={() => cancelar.mutate(p.id)}>Solicitar cancelación</Button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NotificacionesCliente({ notificaciones, onCambio }: { notificaciones: NotificacionCliente[]; onCambio: () => void }) {
  const marcar = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sesión no disponible");
      const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("user_id", u.user.id).eq("leida", false);
      if (error) throw error;
    },
    onSuccess: onCambio,
    onError: () => toast.error("No se pudieron actualizar las notificaciones"),
  });
  if (notificaciones.length === 0) return null;
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Clock3 className="size-5 text-primary" /> Avisos de tu cuenta</h2>
        {notificaciones.some((n) => !n.leida) && <Button size="sm" variant="outline" onClick={() => marcar.mutate()} disabled={marcar.isPending}>Marcar todo como leído</Button>}
      </div>
      <ul className="mt-4 space-y-3">
        {notificaciones.map((n) => <li key={n.id} className={`rounded-2xl p-4 ${n.leida ? "bg-brand-mist" : "border border-brand-lilac bg-brand-lavender/40"}`}>
          <div className="flex items-start justify-between gap-3"><p className="font-semibold text-foreground">{n.titulo}</p>{!n.leida && <Badge className="rounded-full bg-primary">Nuevo</Badge>}</div>
          {n.cuerpo && <p className="mt-1 text-sm text-muted-foreground">{n.cuerpo}</p>}
          <p className="mt-2 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</p>
        </li>)}
      </ul>
    </section>
  );
}

function FormPerfil({ userId, email, nombre, telefono }: { userId: string; email: string; nombre: string; telefono: string }) {
  const qc = useQueryClient();
  const guardar = useMutation({
    mutationFn: async (valores: { nombre_completo: string; telefono: string }) => {
      const { error } = await supabase.from("profiles").update(valores).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Datos guardados");
      qc.invalidateQueries({ queryKey: ["cuenta"] });
    },
    onError: () => toast.error("No se pudieron guardar los datos"),
  });

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nombre_completo = String(fd.get("nombre_completo") ?? "").trim();
    const cel = esquemaCelular.safeParse(String(fd.get("telefono") ?? ""));
    if (nombre_completo.length < 3) { toast.error("Escribe tu nombre completo"); return; }
    if (!cel.success) { toast.error(cel.error.issues[0]?.message ?? "Celular no válido"); return; }
    guardar.mutate({ nombre_completo, telefono: cel.data });
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><UserRound className="size-5 text-primary" /> Mis datos</h2>
      <form onSubmit={enviar} className="mt-5 space-y-4">
        <div className="space-y-1.5"><Label htmlFor="nombre_completo">Nombre completo</Label><Input id="nombre_completo" name="nombre_completo" defaultValue={nombre} className="h-11 rounded-xl" /></div>
        <div className="space-y-1.5"><Label htmlFor="telefono">Celular</Label><Input id="telefono" name="telefono" type="tel" defaultValue={telefono} placeholder="311 819 9006" className="h-11 rounded-xl" /></div>
        <div className="space-y-1.5"><Label>Correo</Label><Input value={email} disabled className="h-11 rounded-xl" /></div>
        <Button type="submit" variant="hero" disabled={guardar.isPending}>Guardar cambios</Button>
      </form>
    </section>
  );
}

type Direccion = { id: string; etiqueta: string; direccion: string; barrio: string | null; referencia: string | null; es_principal: boolean };

function Direcciones({ userId, direcciones, onCambio }: { userId: string; direcciones: Direccion[]; onCambio: () => void }) {
  const [errores, setErrores] = useState<Record<string, string>>({});

  const agregar = useMutation({
    mutationFn: async (d: { etiqueta: string; direccion: string; barrio?: string | undefined; referencia?: string | undefined }) => {
      const { error } = await supabase.from("direcciones").insert({
        cliente_id: userId,
        etiqueta: d.etiqueta,
        direccion: d.direccion,
        barrio: d.barrio || null,
        referencia: d.referencia || null,
        es_principal: direcciones.length === 0,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Dirección guardada"); onCambio(); },
    onError: () => toast.error("No se pudo guardar la dirección"),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("direcciones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: onCambio,
    onError: () => toast.error("No se pudo eliminar"),
  });

  const principal = useMutation({
    mutationFn: async (id: string) => {
      const a = await supabase.from("direcciones").update({ es_principal: false }).eq("cliente_id", userId);
      if (a.error) throw a.error;
      const b = await supabase.from("direcciones").update({ es_principal: true }).eq("id", id);
      if (b.error) throw b.error;
    },
    onSuccess: onCambio,
  });

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const r = esquemaDireccion.safeParse(Object.fromEntries(new FormData(form)));
    if (!r.success) {
      setErrores(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrores({});
    agregar.mutate(r.data, { onSuccess: () => form.reset() });
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><MapPin className="size-5 text-primary" /> Mis direcciones</h2>
      <ul className="mt-5 space-y-3">
        {direcciones.length === 0 && <li className="rounded-2xl bg-brand-mist p-4 text-sm text-muted-foreground">Aún no tienes direcciones guardadas.</li>}
        {direcciones.map((d) => (
          <li key={d.id} className="flex items-start gap-3 rounded-2xl border border-border p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-lavender text-primary"><Home className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                {d.etiqueta}
                {d.es_principal && <Badge className="rounded-full bg-primary px-2 py-0 text-[10px]">Principal</Badge>}
              </p>
              <p className="text-sm text-muted-foreground">{d.direccion}{d.barrio ? ` · ${d.barrio}` : ""}</p>
              {d.referencia && <p className="text-xs text-muted-foreground">{d.referencia}</p>}
            </div>
            {!d.es_principal && (
              <Button size="icon" variant="ghost" aria-label="Marcar como principal" onClick={() => principal.mutate(d.id)}><Star /></Button>
            )}
            <Button size="icon" variant="ghost" aria-label="Eliminar dirección" onClick={() => eliminar.mutate(d.id)}><Trash2 /></Button>
          </li>
        ))}
      </ul>
      <form onSubmit={enviar} className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2" noValidate>
        <div className="space-y-1.5"><Label htmlFor="etiqueta">Nombre</Label><Input id="etiqueta" name="etiqueta" placeholder="Casa, Trabajo…" className="h-11 rounded-xl" />{errores["etiqueta"] && <p className="text-xs text-destructive">{errores["etiqueta"]}</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="barrio">Barrio</Label><Input id="barrio" name="barrio" className="h-11 rounded-xl" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="direccion">Dirección</Label><Input id="direccion" name="direccion" placeholder="Calle 5 # 3-20" className="h-11 rounded-xl" />{errores["direccion"] && <p className="text-xs text-destructive">{errores["direccion"]}</p>}</div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="referencia">Punto de referencia</Label><Input id="referencia" name="referencia" placeholder="Frente al parque, casa esquinera…" className="h-11 rounded-xl" /></div>
        <Button type="submit" variant="hero" className="sm:col-span-2 sm:w-fit" disabled={agregar.isPending}>Agregar dirección</Button>
      </form>
    </section>
  );
}
