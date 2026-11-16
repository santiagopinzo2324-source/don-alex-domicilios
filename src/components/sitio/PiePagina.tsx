import { Link } from "@tanstack/react-router";
import { Clock, MapPin, MessageCircle } from "lucide-react";

import { Logo } from "@/components/marca/Logo";
import { EMPRESA, enlaceWhatsApp } from "@/lib/empresa";

export function PiePagina() {
  return (
    <footer className="bg-brand-deep text-on-brand-muted">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Logo tono="oscuro" tamano={52} />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            Domicilios, compras, recogidas y mandados con responsabilidad y buena atención en {EMPRESA.ciudad}.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-display text-base font-semibold text-on-brand">Contacto</p>
          <p className="flex items-center gap-2"><MapPin className="size-4 text-brand-lilac" /> {EMPRESA.ciudad}, {EMPRESA.pais}</p>
          <p className="flex items-center gap-2"><Clock className="size-4 text-brand-lilac" /> {EMPRESA.horario}</p>
          <a href={enlaceWhatsApp()} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-on-brand">
            <MessageCircle className="size-4 text-brand-lilac" /> WhatsApp oficial
          </a>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-display text-base font-semibold text-on-brand">Empresa</p>
          <a href="/#tarifas" className="block hover:text-on-brand">Tarifas</a>
          <a href="/#aliados" className="block hover:text-on-brand">Restaurantes y domiciliarios</a>
          <Link to="/marca" className="block hover:text-on-brand">Manual de marca</Link>
        </div>
      </div>
      <div className="border-t border-on-brand/10 py-5 text-center text-xs">
        © {new Date().getFullYear()} {EMPRESA.nombre}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
