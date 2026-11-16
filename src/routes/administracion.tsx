import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/marca/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/administracion")({
  ssr: false,
  component: AccesoAdministracion,
});

function AccesoAdministracion() {
  const [usuario, setUsuario] = useState("alex");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);

  async function ingresar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (usuario.trim().toLowerCase() !== "alex") {
      toast.error("Usuario o contraseña incorrectos.");
      return;
    }
    setCargando(true);
    let acceso: { access_token?: string; refresh_token?: string; error?: string } | null = null;
    try {
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!projectUrl || !publishableKey) {
        throw new Error("La conexión con el servicio de acceso no está configurada.");
      }

      // Enviar únicamente la clave apikey. No adjuntar Authorization heredado
      // de una sesión anterior: las claves publishable nuevas no son JWT.
      const response = await fetch(`${projectUrl.replace(/\/+$/, "")}/functions/v1/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
        },
        body: JSON.stringify({ username: usuario.trim(), password: contrasena }),
      });
      acceso = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(acceso?.error || `El servicio de acceso respondió con código ${response.status}.`);
      }
    } catch (err) {
      setCargando(false);
      toast.error(err instanceof Error ? err.message : "No fue posible conectar con el acceso administrativo.");
      return;
    }
    if (!acceso?.access_token || !acceso?.refresh_token) {
      setCargando(false);
      toast.error(acceso?.error || "El servicio no entregó una sesión válida. Revisa la configuración administrativa.");
      return;
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: acceso.access_token,
      refresh_token: acceso.refresh_token,
    });
    if (sessionError) {
      setCargando(false);
      toast.error("No fue posible iniciar la sesión administrativa.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { data: roles, error: roleError } = await supabase
      .from("user_roles").select("role").eq("user_id", auth.user?.id ?? "");
    if (roleError || !roles?.some((r) => r.role === "admin")) {
      await supabase.auth.signOut();
      setCargando(false);
      toast.error("Esta cuenta no tiene permisos de administración.");
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-mist px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-soft sm:p-9">
        <Link to="/" className="mb-8 inline-block"><Logo tamano={46} /></Link>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-lavender text-primary"><ShieldCheck className="size-6" /></span>
        <h1 className="mt-5 font-display text-2xl font-bold text-foreground">Acceso administrativo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ingresa con las credenciales autorizadas de administración.</p>
        <form onSubmit={ingresar} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usuario">Usuario</Label>
            <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input id="contrasena" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="current-password" required />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={cargando}>
            <LockKeyhole className="mr-2 size-4" />{cargando ? "Verificando…" : "Ingresar"}
          </Button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">Acceso exclusivo para personal autorizado.</p>
      </section>
    </main>
  );
}
