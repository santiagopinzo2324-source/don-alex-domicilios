import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bike, MailCheck, Store, User } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import heroImg from "@/assets/hero-domiciliario.jpg";
import { BotonGoogle } from "@/components/auth/BotonGoogle";
import { Logo } from "@/components/marca/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { esquemaCelular, esquemaIngreso, esquemaRegistro, esquemaRegistroCliente } from "@/lib/validacion";

type Modo = "ingresar" | "registro" | "recuperar";

function destinoSeguro(valor: unknown): string {
  if (typeof valor !== "string") return "/cuenta";
  try {
    const url = new URL(valor, "http://x");
    if (url.origin !== "http://x" || url.pathname.startsWith("/auth")) return "/cuenta";
    return url.pathname + url.search;
  } catch {
    return "/cuenta";
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { modo?: Modo | undefined; redirect?: string | undefined } => ({
    modo: s["modo"] === "registro" || s["modo"] === "recuperar" ? s["modo"] : undefined,
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ingresar · Don Alex Domicilios" },
      { name: "description", content: "Ingresa o crea tu cuenta en Domicilio Independiente Don Alex, Pitalito." },
      { property: "og:title", content: "Ingresar · Don Alex Domicilios" },
      { property: "og:description", content: "Tu cuenta para pedir y seguir domicilios en Pitalito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaAuth,
});

function PaginaAuth() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const accesoDomiciliario = search.redirect === "/domiciliario";
  const [modo, setModo] = useState<Modo>(search.modo ?? "ingresar");
  const destino = destinoSeguro(search.redirect);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: destino, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN") navigate({ to: destino, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [destino, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-brand lg:block">
        <img src={heroImg} alt="" width={1280} height={1280} className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-glow" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/"><Logo tono="oscuro" tamano={52} /></Link>
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-on-brand">
              Pide, sigue y recibe tu domicilio en Pitalito.
            </h2>
            <p className="mt-4 max-w-md text-on-brand-muted">Una sola cuenta para clientes y negocios aliados.</p>
          </div>
        </div>
      </aside>
      <main className="flex items-center justify-center bg-brand-mist px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block lg:hidden"><Logo tamano={44} /></Link>
          <div className="rounded-3xl border border-border bg-card p-7 shadow-soft sm:p-9">
            {modo === "ingresar" && <FormIngreso onModo={setModo} accesoDomiciliario={accesoDomiciliario} />}
            {modo === "registro" && <FormRegistro onModo={setModo} accesoDomiciliario={accesoDomiciliario} />}
            {modo === "recuperar" && <FormRecuperar onModo={setModo} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function Campo({ id, label, error, ...props }: { id: string; label: string; error?: string | undefined } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} className="h-11 rounded-xl" aria-invalid={!!error} {...props} />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function Separador() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function FormIngreso({ onModo, accesoDomiciliario }: { onModo: (m: Modo) => void; accesoDomiciliario: boolean }) {
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.currentTarget));
    setErrores({});
    const r = esquemaIngreso.safeParse(datos);
    if (!r.success) {
      setErrores(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword(r.data);
    setCargando(false);
    if (error) toast.error(error.message.includes("Email not confirmed") ? "Confirma tu correo electrónico para ingresar." : "Correo o contraseña incorrectos.");
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-foreground">{accesoDomiciliario ? "Acceso para domiciliarios" : "Bienvenido de nuevo"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{accesoDomiciliario ? "Ingresa a tu cuenta de domiciliario para entrar a tu módulo de trabajo." : "Ingresa a tu cuenta de Don Alex."}</p>
      <div className="mt-5"><BotonGoogle /></div>
      <Separador />
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo id="email" label="Correo electrónico" type="email" autoComplete="email" error={errores["email"]} />
        <Campo id="password" label="Contraseña" type="password" autoComplete="current-password" error={errores["password"]} />
        <button type="button" onClick={() => onModo("recuperar")} className="text-sm font-semibold text-primary hover:underline">¿Olvidaste tu contraseña?</button>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={cargando}>{cargando ? "Ingresando…" : "Ingresar"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">{accesoDomiciliario ? "¿Aún no tienes cuenta de domiciliario? " : "¿No tienes cuenta? "}
        <button onClick={() => onModo("registro")} className="font-semibold text-primary hover:underline">Crear cuenta</button>
      </p>
    </>
  );
}

const TIPOS = [
  { valor: "cliente", texto: "Cliente", icono: User },
  { valor: "restaurante", texto: "Negocio", icono: Store },
] as const;

function searchRedirect() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
}

function FormRegistro({ onModo, accesoDomiciliario }: { onModo: (m: Modo) => void; accesoDomiciliario: boolean }) {
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["valor"]>("cliente");
  const tipoRegistro = accesoDomiciliario ? "domiciliario" as const : tipo;
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [enviadoA, setEnviadoA] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cargando) return;
    const bruto = Object.fromEntries(new FormData(e.currentTarget));
    setErrores({});
    const datos = { ...bruto, tipo_cuenta: tipoRegistro };
    const r = tipoRegistro === "cliente"
      ? esquemaRegistroCliente.safeParse(datos)
      : esquemaRegistro.safeParse(datos);
    if (!r.success) {
      setErrores(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    // Nunca crear usuario ni enviar postulación si faltan datos obligatorios.
    setCargando(true);
    const { email, password, ...meta } = r.data;
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth${searchRedirect()}`, data: meta },
    });
    setCargando(false);
    if (error) {
      toast.error(error.message.includes("already") ? "Ese correo ya tiene una cuenta. Ingresa con ese correo o recupera tu contraseña." : `No se pudo crear la cuenta: ${error.message}`);
      return;
    }
    if (data.session) {
      toast.success(tipoRegistro === "cliente" ? "¡Tu cuenta está lista!" : tipoRegistro === "domiciliario" ? "¡Postulación enviada! Queda pendiente de aprobación." : "¡Solicitud registrada! Queda pendiente de aprobación.");
      return;
    }
    setEnviadoA(email);
  }

  if (enviadoA) return (
    <div className="text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-lavender text-primary"><MailCheck className="size-7" /></span>
      <h1 className="mt-5 font-display text-2xl font-bold text-foreground">Revisa tu correo</h1>
      <p className="mt-2 text-sm text-muted-foreground">Enviamos un enlace de confirmación a <strong className="text-foreground">{enviadoA}</strong>. Ábrelo para activar tu cuenta.</p>
      <Button variant="outline" className="mt-6" onClick={() => onModo("ingresar")}>Volver a ingresar</Button>
    </div>
  );

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-foreground">{accesoDomiciliario ? "Crear cuenta de domiciliario" : "Crea tu cuenta"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{accesoDomiciliario ? "Registra tus datos para enviar tu postulación a Don Alex." : "¿Cómo vas a usar Don Alex?"}</p>
      {!accesoDomiciliario && <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de cuenta">
        {TIPOS.map(({ valor, texto, icono: Icono }) => (
          <button key={valor} type="button" role="radio" aria-checked={tipo === valor} onClick={() => setTipo(valor)}
            className={cn("flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-semibold transition-all",
              tipo === valor ? "border-primary bg-brand-lavender text-brand-deep shadow-soft" : "border-border text-muted-foreground hover:border-brand-lilac")}>
            <Icono className="size-5" /> {texto}
          </button>
        ))}
      </div>}
      {tipoRegistro !== "cliente" && <p className="mt-3 rounded-xl bg-brand-mist p-3 text-xs text-muted-foreground">
        {tipoRegistro === "domiciliario" ? "Tu postulación como domiciliario se enviará a administración para revisión. Después podrás consultar su estado desde este módulo." : "Tu solicitud de negocio será revisada por un administrador antes de habilitar sus funciones."}
      </p>}
      {tipoRegistro === "cliente" && <><div className="mt-5"><BotonGoogle /></div><Separador /></>}
      <form onSubmit={enviar} className={cn("space-y-4", tipoRegistro !== "cliente" && "mt-5")} noValidate>
        <Campo id="nombre_completo" label="Nombre completo" autoComplete="name" required minLength={3} maxLength={100} error={errores["nombre_completo"]} />
        {tipoRegistro !== "cliente" && <Campo id="telefono" label="Número de WhatsApp" type="tel" inputMode="tel" placeholder="311 819 9006" autoComplete="tel" required error={errores["telefono"]} />}
        <Campo id="email" label="Correo electrónico" type="email" autoComplete="email" required maxLength={255} error={errores["email"]} />
        <Campo id="password" label="Contraseña" type="password" autoComplete="new-password" required minLength={8} maxLength={72} error={errores["password"]} />
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={cargando}>{cargando ? "Creando cuenta…" : "Crear cuenta"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">¿Ya tienes cuenta?{" "}
        <button onClick={() => onModo("ingresar")} className="font-semibold text-primary hover:underline">Ingresar</button>
      </p>
    </>
  );
}

function FormRecuperar({ onModo }: { onModo: (m: Modo) => void }) {
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) return;
    setCargando(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setCargando(false);
    setEnviado(true);
  }
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-foreground">Recuperar contraseña</h1>
      {enviado ? (
        <p className="mt-3 text-sm text-muted-foreground">Si el correo está registrado, te llegará un enlace para crear una nueva contraseña.</p>
      ) : (
        <form onSubmit={enviar} className="mt-6 space-y-4">
          <Campo id="email" label="Correo electrónico" type="email" autoComplete="email" required />
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={cargando}>Enviar enlace</Button>
        </form>
      )}
      <button onClick={() => onModo("ingresar")} className="mt-6 text-sm font-semibold text-primary hover:underline">← Volver a ingresar</button>
    </>
  );
}
