import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/marca/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña · Don Alex Domicilios" },
      { name: "description", content: "Crea una nueva contraseña para tu cuenta de Don Alex." },
      { property: "og:title", content: "Nueva contraseña · Don Alex" },
      { property: "og:description", content: "Restablece el acceso a tu cuenta de Don Alex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Restablecer,
});

function Restablecer() {
  const navigate = useNavigate();
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setListo(true);
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") setListo(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== fd.get("confirmar")) { toast.error("Las contraseñas no coinciden."); return; }
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password });
    setCargando(false);
    if (error) { toast.error("No se pudo cambiar la contraseña. Solicita un nuevo enlace."); return; }
    toast.success("Contraseña actualizada.");
    navigate({ to: "/cuenta" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-mist px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <Link to="/"><Logo tamano={40} /></Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-foreground">Crea tu nueva contraseña</h1>
        {listo ? (
          <form onSubmit={enviar} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="password">Nueva contraseña</Label><Input id="password" name="password" type="password" autoComplete="new-password" className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label htmlFor="confirmar">Confirmar contraseña</Label><Input id="confirmar" name="confirmar" type="password" autoComplete="new-password" className="h-11 rounded-xl" /></div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={cargando}>Guardar contraseña</Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Abre esta página desde el enlace que te enviamos al correo. <Link to="/auth" search={{ modo: "recuperar" }} className="font-semibold text-primary">Solicitar un enlace nuevo</Link>
          </p>
        )}
      </div>
    </main>
  );
}
