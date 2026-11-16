import { Link } from "@tanstack/react-router";
import { MessageCircle, UserRound } from "lucide-react";

import { Logo } from "@/components/marca/Logo";
import { Button } from "@/components/ui/button";
import { useSesion } from "@/hooks/use-sesion";
import { enlaceWhatsApp } from "@/lib/empresa";

const enlaces = [
  { href: "/#servicios", texto: "Servicios" },
  { href: "/#tarifas", texto: "Tarifas" },
  { href: "/#categorias", texto: "Categorías" },
  { href: "/#aliados", texto: "Aliados" },
  { href: "/#cobertura", texto: "Cobertura" },
  { href: "/#mapa", texto: "Mapa" },
];

export function Encabezado() {
  const { data: sesion, isSuccess } = useSesion();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo tamano={40} />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {enlaces.map((e) => (
            <a
              key={e.href}
              href={e.href}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              {e.texto}
            </a>
          ))}
          <Link
            to="/marca"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            Marca
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <span className="min-w-[5.5rem]">
            {isSuccess &&
              (sesion ? (
                <Button asChild variant="ghost" size="sm" className="h-10">
                  <Link to="/cuenta"><UserRound /> Mi cuenta</Link>
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm" className="h-10">
                  <Link to="/auth">Ingresar</Link>
                </Button>
              ))}
          </span>
          <Button asChild variant="ghost" size="sm" className="hidden h-10 px-3 sm:inline-flex">
            <a href="/domiciliario">Portal domiciliarios</a>
          </Button>
          <Button asChild variant="hero" size="sm" className="hidden h-10 px-4 sm:inline-flex">
            <a href={enlaceWhatsApp("Hola Don Alex, quiero pedir un domicilio")} target="_blank" rel="noreferrer">
              <MessageCircle /> Pedir domicilio
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
