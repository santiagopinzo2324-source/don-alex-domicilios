import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bike,
  CircleCheck,
  ClipboardList,
  HandCoins,
  MapPin,
  MessageCircle,
  Package,
  Route as RutaIcono,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  Truck,
  Zap,
} from "lucide-react";

import heroImg from "@/assets/hero-domiciliario.jpg";
import { Logo } from "@/components/marca/Logo";
import { Encabezado } from "@/components/sitio/Encabezado";
import { PiePagina } from "@/components/sitio/PiePagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORIAS } from "@/lib/categorias";
import { TARIFAS_POR_DEFECTO, formatearCOP } from "@/lib/tarifas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Don Alex · Domicilios en Pitalito desde $6.000" },
      {
        name: "description",
        content:
          "Domicilio Independiente Don Alex: domicilios, compras, recogidas y mandados en Pitalito, Huila. Tarifa urbana plana de $6.000.",
      },
      { property: "og:title", content: "Don Alex · Domicilios en Pitalito desde $6.000" },
      {
        property: "og:description",
        content: "Pide por WhatsApp o en línea. Cualquier barrio del área urbana de Pitalito por $6.000.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

const SERVICIOS = [
  { icono: Package, titulo: "Domicilios", texto: "Llevamos tu pedido del restaurante a tu puerta." },
  { icono: ShoppingCart, titulo: "Compras", texto: "Compramos por ti en la tienda o supermercado." },
  { icono: Truck, titulo: "Recogidas", texto: "Recogemos paquetes y documentos donde estén." },
  { icono: RutaIcono, titulo: "Mandados", texto: "Pagos, diligencias y encargos del día a día." },
];

const MODULOS = [
  { icono: Smartphone, titulo: "Clientes", texto: "Pide, paga y sigue tu domicilio en tiempo real.", etapa: 4 },
  { icono: Bike, titulo: "Domiciliarios", texto: "Recibe servicios, actualiza estados y controla tus ganancias.", etapa: 5 },
  { icono: Store, titulo: "Restaurantes", texto: "Gestiona tu menú, confirma pedidos y solicita domiciliario.", etapa: 6 },
  { icono: MessageCircle, titulo: "WhatsApp", texto: "Pedidos y seguimiento sin descargar aplicaciones.", etapa: 7 },
];

function Inicio() {
  return (
    <div className="min-h-screen bg-background">
      <Encabezado />
      <main>
        {/* Portada */}
        <section className="relative overflow-hidden bg-gradient-brand">
          <div className="absolute inset-0 bg-glow" aria-hidden />
          <div className="absolute inset-0 bg-dots opacity-20" aria-hidden />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.1fr_1fr] lg:px-8">
            <div className="animate-fade-up">
              <Badge className="mb-6 rounded-full border-on-brand/20 bg-on-brand/10 px-3 py-1 text-on-brand backdrop-blur hover:bg-on-brand/10">
                <MapPin className="mr-1 size-3.5" /> Pitalito, Huila
              </Badge>
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] text-on-brand sm:text-5xl lg:text-6xl">
                Tu domicilio a cualquier barrio por{" "}
                <span className="text-brand-lilac">{formatearCOP(TARIFAS_POR_DEFECTO.urbana)}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-on-brand-muted">
                Domicilios, compras, recogidas y mandados con la confianza de Don Alex. Una sola tarifa para
                toda el área urbana, sin sorpresas.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="onBrand" size="xl">
                  <a href="https://wa.me/573118199006?text=Hola%20Don%20Alex%2C%20quiero%20pedir%20un%20domicilio" rel="noopener noreferrer">
                    <MessageCircle /> Pedir por WhatsApp
                  </a>
                </Button>
                <Button asChild variant="onBrandOutline" size="xl">
                  <a href="#tarifas">
                    Ver tarifas <ArrowRight />
                  </a>
                </Button>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-on-brand/15 pt-8">
                {[
                  ["$6.000", "Tarifa urbana"],
                  ["7 días", "A la semana"],
                  ["100%", "Precio antes de confirmar"],
                ].map(([v, t]) => (
                  <div key={t}>
                    <dt className="font-display text-2xl font-bold text-on-brand">{v}</dt>
                    <dd className="mt-1 text-xs font-medium text-on-brand-muted">{t}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-brand-lilac/25 blur-2xl" aria-hidden />
              <img
                src={heroImg}
                alt="Domiciliario de Don Alex en moto por las calles de Pitalito"
                width={1280}
                height={1280}
                className="relative aspect-square w-full rounded-[2rem] object-cover shadow-lift ring-1 ring-on-brand/20"
              />
              <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-lift animate-float sm:-left-8">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-lavender text-primary">
                  <CircleCheck className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">Pedido entregado</p>
                  <p className="text-xs text-muted-foreground">Barrio Centro · 18 min</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Apartado exclusivo para domiciliarios */}
        <section id="domiciliarios" className="scroll-mt-20 bg-brand-mist py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl border border-brand-lilac/60 bg-card shadow-soft">
              <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex items-start gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-lavender text-primary">
                    <Bike className="size-7" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-vivid">Acceso de trabajo</p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">Domiciliarios</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Ingresa a tu portal para revisar pedidos disponibles, gestionar tus entregas y consultar tus ganancias. El acceso para recibir servicios se habilita después de la aprobación de la administración y la verificación de los requisitos correspondientes.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                  <Button asChild variant="hero" size="lg">
                    <a href="/domiciliario">Entrar a Domiciliarios <ArrowRight className="ml-2 size-4" /></a>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <a href="/auth">Iniciar sesión</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="scroll-mt-20 py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-vivid">Servicios</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
                Todo lo que necesitas mover en Pitalito
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICIOS.map(({ icono: Icono, titulo, texto }) => (
                <article
                  key={titulo}
                  className="group rounded-3xl border border-border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand-lilac hover:shadow-brand"
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-vivid text-on-brand shadow-brand">
                    <Icono className="size-6" />
                  </span>
                  <h3 className="mt-6 text-lg font-bold text-foreground">{titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Tarifas */}
        <section id="tarifas" className="scroll-mt-20 bg-gradient-soft py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-vivid">Tarifas oficiales</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
                Una sola tarifa para toda la ciudad
              </h2>
              <p className="mt-4 text-muted-foreground">
                No cobramos más por cambiar de barrio ni por estar al otro lado de Pitalito. Siempre conoces el
                precio antes de confirmar.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <TarjetaTarifa
                destacada
                titulo="Área urbana de Pitalito"
                detalle="Cualquier barrio del casco urbano"
                valor={formatearCOP(TARIFAS_POR_DEFECTO.urbana)}
              />
              <TarjetaTarifa
                titulo="Sectores alejados"
                detalle="Sectores considerablemente retirados del casco urbano"
                valor={formatearCOP(TARIFAS_POR_DEFECTO.alejada)}
              />
              <TarjetaTarifa
                titulo="Zona rural y especiales"
                detalle="Veredas y recorridos especiales"
                valor={`Desde ${formatearCOP(TARIFAS_POR_DEFECTO.rural)}`}
              />
              <TarjetaTarifa
                titulo="Compras"
                detalle="Hacemos tus compras por ti en tiendas y supermercados."
                valor={`Desde ${formatearCOP(7000)}`}
              />
            </div>
            <div className="mx-auto mt-10 flex max-w-3xl items-start gap-3 rounded-2xl border border-brand-lilac/50 bg-card p-5 text-sm text-muted-foreground shadow-soft">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <p>
                Si una dirección no se puede ubicar con claridad, un asesor de Don Alex confirma la tarifa contigo
                antes de enviar el domiciliario. Nunca te cobramos un valor que no hayas aceptado.
              </p>
            </div>
          </div>
        </section>

        {/* Cobertura y horarios especiales */}
        <section id="cobertura" className="scroll-mt-20 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-brand-lilac/50 bg-card p-6 shadow-soft sm:p-8">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 size-6 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-vivid">Cobertura y horarios</p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Antes de confirmar tu domicilio</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Para prestarte un servicio seguro y organizado, tenemos estas condiciones de cobertura:
                  </p>
                </div>
              </div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                <li className="rounded-2xl bg-brand-mist p-4">
                  <p className="font-bold text-foreground">Barrio Popular y barrio Porvenir</p>
                  <p className="mt-1 text-sm text-muted-foreground">Por el momento no contamos con cobertura de domicilios en estos sectores.</p>
                </li>
                <li className="rounded-2xl bg-brand-mist p-4">
                  <p className="font-bold text-foreground">Villa del Prado</p>
                  <p className="mt-1 text-sm text-muted-foreground">Recibimos pedidos hasta las 5:30 p. m. La disponibilidad debe confirmarse antes de aceptar el pedido.</p>
                </li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Otros sectores pueden tener horarios o condiciones especiales. Te informaremos la disponibilidad antes de confirmar; nunca enviaremos un pedido sin avisarte previamente.
              </p>
            </div>
          </div>
        </section>

        {/* Mapa de referencia de cobertura */}
        <section id="mapa" className="scroll-mt-20 bg-brand-mist py-16 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-vivid">Mapa de Pitalito</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground">Consulta nuestra zona de servicio</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Este mapa te permite ubicar Pitalito y orientarte. Los límites exactos de cada barrio todavía están pendientes de validación; por eso no usamos el mapa para aprobar o rechazar automáticamente una dirección.</p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="rounded-xl border border-border bg-card p-4"><strong className="text-foreground">Barrio Popular y Porvenir</strong><p className="mt-1 text-muted-foreground">Sin cobertura por el momento.</p></li>
                <li className="rounded-xl border border-border bg-card p-4"><strong className="text-foreground">Villa del Prado</strong><p className="mt-1 text-muted-foreground">Pedidos hasta las 5:30 p. m., sujetos a confirmación.</p></li>
                <li className="rounded-xl border border-border bg-card p-4"><strong className="text-foreground">Otros sectores</strong><p className="mt-1 text-muted-foreground">Confirmamos disponibilidad antes de aceptar el domicilio.</p></li>
              </ul>
              <a href="https://www.openstreetmap.org/search?query=Pitalito%2C%20Huila%2C%20Colombia" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-semibold text-primary hover:underline">Abrir mapa completo de Pitalito <MapPin className="size-4" /></a>
            </div>
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <iframe title="Mapa de referencia de Pitalito, Huila" src="https://www.openstreetmap.org/export/embed.html?bbox=-76.10%2C1.80%2C-75.99%2C1.90&layer=mapnik" className="h-[380px] w-full border-0 sm:h-[460px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              <p className="p-3 text-xs text-muted-foreground">Mapa de referencia © OpenStreetMap. No representa aún los límites oficiales de cobertura de Don Alex.</p>
            </div>
          </div>
        </section>

        {/* Categorías */}
        <section id="categorias" className="scroll-mt-20 py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-vivid">Categorías</p>
                <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
                  Pide de donde quieras
                </h2>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Restaurantes, tiendas, farmacias y más negocios de Pitalito, en un solo lugar.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {CATEGORIAS.map(({ slug, nombre, icono: Icono, restringida }) => (
                <div
                  key={slug}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-3 py-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-lilac hover:bg-brand-lavender"
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-lavender text-primary transition-colors group-hover:bg-card">
                    <Icono className="size-6" />
                  </span>
                  <span className="text-xs font-semibold text-foreground sm:text-sm">{nombre}</span>
                  {restringida && (
                    <span className="absolute right-2 top-2 rounded-full bg-brand-deep px-1.5 py-0.5 text-[10px] font-bold text-on-brand">
                      +18
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="bg-brand-mist py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-display text-3xl font-bold text-foreground sm:text-4xl">
              Pedir es así de fácil
            </h2>
            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                { icono: ClipboardList, t: "Cuéntanos qué necesitas", d: "Por WhatsApp o en línea: dónde recoger, a dónde llevar y cómo pagas." },
                { icono: HandCoins, t: "Confirma el precio", d: "Ves el valor del domicilio antes de aceptar. En la ciudad, $6.000." },
                { icono: Zap, t: "Recibe tu pedido", d: "Te avisamos cuando el domiciliario recoge y cuando va en camino." },
              ].map(({ icono: Icono, t, d }, i) => (
                <li key={t} className="relative rounded-3xl bg-card p-8 shadow-soft">
                  <span className="font-display text-6xl font-extrabold text-brand-lavender">0{i + 1}</span>
                  <Icono className="absolute right-8 top-8 size-7 text-brand-vivid" />
                  <h3 className="mt-2 text-lg font-bold text-foreground">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Plataforma */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-vivid">Plataforma Don Alex</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
                Cuatro módulos, una sola operación
              </h2>
              <p className="mt-4 text-muted-foreground">
                Clientes, domiciliarios, negocios aliados y WhatsApp conectados a la misma operación.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/domiciliario" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90">Entrar al portal de domiciliarios</a>
                <a href="/auth?modo=registro" className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground hover:border-brand-lilac">Crear una cuenta</a>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">El acceso operativo se habilita únicamente después de la revisión y aprobación administrativa, y de verificar los requisitos legales y documentos aplicables.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {MODULOS.map(({ icono: Icono, titulo, texto, etapa }) => (
                <article key={titulo} className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft">
                  <Icono className="size-7 text-primary" />
                  <h3 className="mt-5 font-bold text-foreground">{titulo}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{texto}</p>
                  <span className="mt-5 inline-flex w-fit rounded-full bg-brand-lavender px-2.5 py-1 text-[11px] font-bold text-brand-deep">
                    En construcción · Etapa {etapa}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Aliados */}
        <section id="aliados" className="scroll-mt-20 pb-24">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <TarjetaAliado
              icono={Store}
              titulo="¿Tienes un restaurante o negocio?"
              texto="Súmate a Don Alex: recibe pedidos y solicita domiciliarios cuando los necesites."
              mensaje="Hola Don Alex, tengo un negocio y quiero registrarme como aliado"
              cta="Registrar mi negocio"
            />
            <TarjetaAliado
              icono={Bike}
              titulo="¿Quieres ser domiciliario?"
              texto="Trabaja con una empresa seria de Pitalito y lleva el control de tus servicios y ganancias."
              mensaje="Hola Don Alex, quiero trabajar como domiciliario"
              cta="Quiero ser domiciliario"
            />
          </div>
        </section>
      </main>
      <PiePagina />

      <a
        href="https://wa.me/573118199006?text=Hola%20Don%20Alex%20%F0%9F%91%8B"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribir por WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lift transition-transform hover:scale-105"
      >
        <MessageCircle className="size-7" />
      </a>
    </div>
  );
}

function TarjetaTarifa({
  titulo,
  detalle,
  valor,
  destacada,
}: {
  titulo: string;
  detalle: string;
  valor: string;
  destacada?: boolean;
}) {
  if (destacada) {
    return (
      <article className="relative overflow-hidden rounded-3xl bg-gradient-brand p-8 text-on-brand shadow-lift">
        <div className="absolute inset-0 bg-glow" aria-hidden />
        <div className="relative">
          <span className="inline-flex rounded-full bg-on-brand/15 px-3 py-1 text-xs font-bold">Tarifa general</span>
          <h3 className="mt-6 text-xl font-bold">{titulo}</h3>
          <p className="mt-1 text-sm text-on-brand-muted">{detalle}</p>
          <p className="mt-8 font-display text-5xl font-extrabold">{valor}</p>
        </div>
      </article>
    );
  }
  return (
    <article className="rounded-3xl border border-border bg-card p-8 shadow-soft">
      <h3 className="mt-11 text-xl font-bold text-foreground">{titulo}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{detalle}</p>
      <p className="mt-8 font-display text-4xl font-extrabold text-primary">{valor}</p>
    </article>
  );
}

function TarjetaAliado({
  icono: Icono,
  titulo,
  texto,
  mensaje,
  cta,
}: {
  icono: typeof Store;
  titulo: string;
  texto: string;
  mensaje: string;
  cta: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[2rem] bg-brand-deep p-8 text-on-brand shadow-lift sm:p-10">
      <div className="absolute -right-10 -top-10 opacity-15" aria-hidden>
        <Logo variante="icono" tamano={200} />
      </div>
      <div className="relative">
        <Icono className="size-8 text-brand-lilac" />
        <h3 className="mt-5 text-2xl font-bold">{titulo}</h3>
        <p className="mt-3 max-w-md text-on-brand-muted">{texto}</p>
        <Button asChild variant="onBrand" size="lg" className="mt-7">
          <a href={`https://wa.me/573118199006?text=${encodeURIComponent(mensaje)}`} rel="noopener noreferrer">
            {cta} <ArrowRight />
          </a>
        </Button>
      </div>
    </article>
  );
}

