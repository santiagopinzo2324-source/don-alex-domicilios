import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { Logo } from "@/components/marca/Logo";
import { Button } from "@/components/ui/button";
import { enlaceWhatsApp } from "@/lib/empresa";

const enlaces = [
  { href: "/#servicios", texto: "Servicios" },
  { href: "/#tarifas", texto: "Tarifas" },
  { href: "/#categorias", texto: "Categorías" },
  { href: "/#aliados", texto: "Aliados" },
];

export function Encabezado() {
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
        <Button asChild variant="hero" size="sm" className="h-10 px-4">
          <a href={enlaceWhatsApp("Hola Don Alex, quiero pedir un domicilio")} target="_blank" rel="noreferrer">
            <MessageCircle /> Pedir domicilio
          </a>
        </Button>
      </div>
    </header>
  );
}
