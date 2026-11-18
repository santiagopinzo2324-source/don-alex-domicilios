import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, CheckCircle2, MessageCircle, Search, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type EstadoNuevo = "activo" | "rechazado" | "retirado";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  activo: "Activo",
  rechazado: "Rechazado",
  retirado: "Retirado",
  suspendido: "Suspendido",
};

const FILTROS = [
  { id: "pendiente", texto: "Pendientes", estados: ["pendiente"] },
  { id: "activo", texto: "Activos", estados: ["activo"] },
  { id: "inactivo", texto: "Rechazados y retirados", estados: ["rechazado", "retirado", "suspendido"] },
  { id: "todos", texto: "Todos", estados: ["pendiente", "activo", "rechazado", "retirado", "suspendido"] },
] as const;

async function cargarSolicitudes() {
  const { data: solicitudes, error } = await supabase
    .from("domiciliarios")
    .select("user_id, numero, estado, disponible, vehiculo, placa, documento_identidad, licencia_vigente, soat_vigente, created_at")
    .in("estado", ["pendiente", "activo", "rechazado", "retirado", "suspendido"] as never)
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
    // La base tiene estados adicionales (rechazado, retirado) que no están en los tipos generados.
    estado: s.estado as string,
    perfil: perfiles?.find((p) => p.id === s.user_id) ?? null,
  }));
}

type Solicitud = Awaited<ReturnType<typeof cargarSolicitudes>>[number];

export const consultaSolicitudesKey = ["admin-solicitudes-domiciliarios"] as const;

function codigo(numero: number | null) {
  return `DOM-${String(numero ?? 0).padStart(3, "0")}`;
}

function enlaceWhatsAppDomi(s: Solicitud) {
  const tel = (s.perfil?.telefono ?? "").replace(/\D/g, "");
  if (tel.length < 10) return null;
  const numero = tel.length === 10 ? `57${tel}` : tel;
  const nombre = s.perfil?.nombre_completo?.split(" ")[0] ?? "";
  const mensaje =
    s.estado === "activo"
      ? `Hola ${nombre} 💜, tu cuenta de domiciliario en Don Alex (${codigo(s.numero)}) está activa. Ya puedes ingresar y marcarte como disponible.`
      : s.estado === "pendiente"
        ? `Hola ${nombre} 💜, te escribimos de Don Alex sobre tu solicitud como domiciliario (${codigo(s.numero)}).`
        : `Hola ${nombre}, te escribimos de Don Alex sobre tu cuenta de domiciliario (${codigo(s.numero)}).`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function SolicitudesDomiciliarios() {
  const qc = useQueryClient();
  const solicitudes = useQuery({ queryKey: consultaSolicitudesKey, queryFn: cargarSolicitudes, refetchInterval: 30000 });
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [confirmar, setConfirmar] = useState<{ s: Solicitud; estado: EstadoNuevo } | null>(null);

  const revisar = useMutation({
    mutationFn: async ({ userId, estado }: { userId: string; estado: EstadoNuevo }) => {
      const { error } = await supabase.rpc("admin_cambiar_estado_domiciliario" as never, { _user_id: userId, _estado: estado } as never);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.estado === "activo" ? "Domiciliario habilitado." : variables.estado === "rechazado" ? "Solicitud rechazada." : "Domiciliario retirado.");
      qc.invalidateQueries({ queryKey: consultaSolicitudesKey });
      qc.invalidateQueries({ queryKey: ["admin-resumen"] });
    },
    onError: (error: Error) => toast.error(error.message || "No se pudo revisar la solicitud."),
  });

  const conteo = useMemo(() => {
    const lista = solicitudes.data ?? [];
    return Object.fromEntries(FILTROS.map((f) => [f.id, lista.filter((s) => (f.estados as readonly string[]).includes(s.estado)).length]));
  }, [solicitudes.data]);

  const visibles = useMemo(() => {
    const estados = FILTROS.find((f) => f.id === filtro)?.estados as readonly string[];
    const q = busqueda.trim().toLowerCase();
    return (solicitudes.data ?? []).filter((s) => {
      if (!estados.includes(s.estado)) return false;
      if (!q) return true;
      return [s.perfil?.nombre_completo, s.perfil?.telefono, codigo(s.numero), s.placa, s.documento_identidad]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [solicitudes.data, filtro, busqueda]);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Solicitudes de domiciliarios</h2>
          <p className="mt-1 text-sm text-muted-foreground">Aprueba, rechaza o retira domiciliarios. Los registros se conservan para mantener el historial.</p>
        </div>
        <span className="rounded-full bg-brand-lavender px-3 py-1 text-sm font-semibold text-primary">{conteo["pendiente"] ?? 0} pendientes</span>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar domiciliarios">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                filtro === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-brand-lilac",
              )}
            >
              {f.texto} <span className="ml-1 opacity-80">{conteo[f.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Buscar domiciliario</span>
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, celular, código o placa" className="h-10 rounded-xl pl-9" />
        </label>
      </div>

      {solicitudes.isError && <p role="alert" className="mt-4 text-sm text-destructive">No se pudieron cargar las solicitudes. Comprueba que la migración del portal esté aplicada.</p>}
      {solicitudes.isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando solicitudes…</p>}
      {!solicitudes.isLoading && !solicitudes.isError && visibles.length === 0 && (
        <p className="mt-4 rounded-xl bg-brand-mist p-4 text-sm text-muted-foreground">
          {(solicitudes.data?.length ?? 0) === 0 ? "Todavía no hay domiciliarios registrados." : "No hay domiciliarios en este filtro."}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {visibles.map((s) => {
          const wa = enlaceWhatsAppDomi(s);
          return (
            <article key={s.user_id} className="flex flex-col gap-4 rounded-xl border border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-lavender text-primary"><Bike className="size-5" /></span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{s.perfil?.nombre_completo || "Nombre no registrado"}</p>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      s.estado === "activo" ? "bg-primary text-primary-foreground" : s.estado === "pendiente" ? "bg-brand-lavender text-brand-deep" : "bg-muted text-muted-foreground",
                    )}>{ETIQUETA_ESTADO[s.estado] ?? s.estado}</span>
                    {s.estado === "activo" && (
                      <span className="text-xs font-semibold text-muted-foreground">{s.disponible ? "● Disponible ahora" : "○ No disponible"}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-bold text-primary">Código: {codigo(s.numero)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.perfil?.telefono || "Teléfono no registrado"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.vehiculo || "Vehículo sin registrar"}{s.placa ? ` · Placa ${s.placa}` : ""}{s.documento_identidad ? ` · Doc. ${s.documento_identidad}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", s.licencia_vigente ? "bg-brand-lavender text-brand-deep" : "bg-muted text-muted-foreground")}>
                      <ShieldCheck className="size-3" /> Licencia {s.licencia_vigente ? "verificada" : "sin verificar"}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", s.soat_vigente ? "bg-brand-lavender text-brand-deep" : "bg-muted text-muted-foreground")}>
                      <ShieldCheck className="size-3" /> SOAT {s.soat_vigente ? "verificado" : "sin verificar"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Registro: {new Date(s.created_at).toLocaleDateString("es-CO")} · ID de cuenta: {s.user_id}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {wa && (
                  <Button asChild variant="whatsapp" size="sm" className="h-9">
                    <a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
                  </Button>
                )}
                {s.estado === "pendiente" && (
                  <>
                    <Button variant="outline" size="sm" className="h-9" disabled={revisar.isPending} onClick={() => setConfirmar({ s, estado: "rechazado" })}><XCircle /> Rechazar</Button>
                    <Button size="sm" className="h-9" disabled={revisar.isPending} onClick={() => revisar.mutate({ userId: s.user_id, estado: "activo" })}><CheckCircle2 /> Aprobar</Button>
                  </>
                )}
                {(s.estado === "rechazado" || s.estado === "retirado" || s.estado === "suspendido") && (
                  <Button size="sm" className="h-9" disabled={revisar.isPending} onClick={() => revisar.mutate({ userId: s.user_id, estado: "activo" })}><CheckCircle2 /> Reactivar</Button>
                )}
                {s.estado === "activo" && (
                  <Button variant="outline" size="sm" className="h-9" disabled={revisar.isPending} onClick={() => setConfirmar({ s, estado: "retirado" })}><XCircle /> Retirar</Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <AlertDialog open={!!confirmar} onOpenChange={(abierto) => !abierto && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar?.estado === "rechazado" ? "¿Rechazar esta solicitud?" : "¿Retirar a este domiciliario?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar?.s.perfil?.nombre_completo || "Este domiciliario"} ({codigo(confirmar?.s.numero ?? 0)}){" "}
              {confirmar?.estado === "rechazado"
                ? "no podrá recibir pedidos. Podrá enviar una nueva solicitud desde su cuenta."
                : "dejará de recibir pedidos de inmediato. Puedes reactivarlo cuando quieras."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmar) revisar.mutate({ userId: confirmar.s.user_id, estado: confirmar.estado });
                setConfirmar(null);
              }}
            >
              {confirmar?.estado === "rechazado" ? "Sí, rechazar" : "Sí, retirar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
