import { createFileRoute } from "@tanstack/react-router";

import conceptoA from "@/assets/logo-concepto-a.png";
import conceptoB from "@/assets/logo-concepto-b.png";
import { Logo } from "@/components/marca/Logo";
import { Encabezado } from "@/components/sitio/Encabezado";
import { PiePagina } from "@/components/sitio/PiePagina";

export const Route = createFileRoute("/marca")({
  head: () => ({
    meta: [
      { title: "Manual de marca · Domicilio Independiente Don Alex" },
      {
        name: "description",
        content: "Logotipos, colores y tipografías oficiales de Domicilio Independiente Don Alex, Pitalito.",
      },
      { property: "og:title", content: "Manual de marca · Don Alex" },
      { property: "og:description", content: "Identidad visual oficial de Domicilio Independiente Don Alex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Marca,
});

const PALETA = [
  { nombre: "Morado oscuro", hex: "#32105C", clase: "bg-brand-deep", texto: "text-on-brand" },
  { nombre: "Morado corporativo", hex: "#6525A8", clase: "bg-brand", texto: "text-on-brand" },
  { nombre: "Morado intenso", hex: "#8238CC", clase: "bg-brand-vivid", texto: "text-on-brand" },
  { nombre: "Lila", hex: "#B78AE8", clase: "bg-brand-lilac", texto: "text-brand-deep" },
  { nombre: "Lavanda claro", hex: "#F0E6FA", clase: "bg-brand-lavender", texto: "text-brand-deep" },
  { nombre: "Gris suave", hex: "#F5F3F7", clase: "bg-brand-mist", texto: "text-brand-deep" },
  { nombre: "Blanco", hex: "#FFFFFF", clase: "bg-background border border-border", texto: "text-brand-deep" },
];

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="py-12">
      <h2 className="font-display text-2xl font-bold text-foreground">{titulo}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Marca() {
  return (
    <div className="min-h-screen bg-background">
      <Encabezado />
      <header className="bg-gradient-brand">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-lilac">Etapa 1</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-on-brand sm:text-5xl">Manual de marca</h1>
          <p className="mt-4 max-w-xl text-on-brand-muted">
            Confianza, rapidez y cercanía: así se ve Domicilio Independiente Don Alex en cada pantalla, casco y maleta.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl divide-y divide-border px-4 sm:px-6 lg:px-8">
        <Seccion titulo="Versiones del logotipo">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="flex min-h-56 items-center justify-center rounded-3xl border border-border bg-card p-8">
              <Logo variante="horizontal" tamano={64} />
            </div>
            <div className="flex min-h-56 items-center justify-center rounded-3xl border border-border bg-brand-lavender p-8">
              <Logo variante="vertical" tamano={88} />
            </div>
            <div className="flex min-h-56 items-center justify-center rounded-3xl border border-border bg-brand-mist p-8">
              <Logo variante="icono" tamano={120} />
            </div>
            <div className="flex min-h-56 items-center justify-center rounded-3xl bg-brand-deep p-8 md:col-span-2">
              <Logo variante="horizontal" tono="oscuro" tamano={72} />
            </div>
            <div className="flex min-h-56 items-center justify-center rounded-3xl bg-gradient-brand p-8">
              <span className="flex size-32 items-center justify-center rounded-full bg-on-brand shadow-lift">
                <Logo variante="icono" tamano={96} />
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Horizontal para web y documentos · Vertical para uniformes, cascos y maletas · Ícono para la app y la foto
            de perfil de WhatsApp.
          </p>
        </Seccion>

        <Seccion titulo="Propuestas originales">
          <div className="grid gap-5 md:grid-cols-2">
            <figure className="rounded-3xl border-2 border-primary bg-card p-6">
              <img src={conceptoA} alt="Propuesta A: marcador de mapa con moto" width={1024} height={1024} loading="lazy" className="mx-auto aspect-square w-full max-w-xs object-contain" />
              <figcaption className="mt-4 text-sm font-semibold text-foreground">
                Propuesta A · Marcador de mapa con moto <span className="text-primary">(en uso)</span>
              </figcaption>
            </figure>
            <figure className="rounded-3xl border border-border bg-card p-6">
              <img src={conceptoB} alt="Propuesta B: ícono cuadrado con scooter" width={1536} height={768} loading="lazy" className="mx-auto aspect-square w-full max-w-xs object-contain" />
              <figcaption className="mt-4 text-sm font-semibold text-foreground">Propuesta B · Ícono de aplicación con scooter</figcaption>
            </figure>
          </div>
        </Seccion>

        <Seccion titulo="Paleta oficial">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {PALETA.map((c) => (
              <div key={c.hex} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className={`flex h-28 items-end p-3 ${c.clase} ${c.texto}`}>
                  <span className="font-mono text-xs font-bold">{c.hex}</span>
                </div>
                <p className="p-3 text-xs font-semibold text-foreground">{c.nombre}</p>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Tipografía">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Títulos · Sora</p>
              <p className="mt-4 font-display text-5xl font-extrabold text-brand-deep">Aa Don Alex</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Texto · Manrope</p>
              <p className="mt-4 text-lg leading-relaxed text-foreground">
                Llevamos tus pedidos a cualquier barrio de Pitalito con responsabilidad y buena atención.
              </p>
            </div>
          </div>
        </Seccion>
      </main>
      <PiePagina />
    </div>
  );
}
