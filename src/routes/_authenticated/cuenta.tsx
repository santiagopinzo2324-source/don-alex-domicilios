import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bike, Home, LogOut, MapPin, Star, Store, Trash2, UserRound } from "lucide-react";
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
    const [perfil, roles, direcciones] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("direcciones").select("*").eq("cliente_id", u.user.id).order("es_principal", { ascending: false }).order("created_at"),
    ]);
    if (perfil.error) throw perfil.error;
    if (roles.error) throw roles.error;
    if (direcciones.error) throw direcciones.error;
    return {
      email: u.user.email ?? "",
      userId: u.user.id,
      perfil: perfil.data,
      roles: (roles.data ?? []).map((r) => r.role),
      direcciones: direcciones.data ?? [],
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
      </main>
    </div>
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
