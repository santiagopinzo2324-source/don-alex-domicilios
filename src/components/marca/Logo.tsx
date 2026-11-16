import icono from "@/assets/logo-icono.png";
import { cn } from "@/lib/utils";

type Variante = "horizontal" | "vertical" | "icono";
type Tono = "claro" | "oscuro";

interface LogoProps {
  variante?: Variante;
  /** "claro" para fondos blancos/lavanda, "oscuro" para fondos morados. */
  tono?: Tono;
  tamano?: number;
  className?: string;
}

export function Logo({ variante = "horizontal", tono = "claro", tamano = 44, className }: LogoProps) {
  const img = (
    <img
      src={icono}
      alt={variante === "icono" ? "Don Alex" : ""}
      width={tamano}
      height={tamano}
      style={{ width: tamano, height: tamano }}
      className="shrink-0 object-contain drop-shadow-sm"
    />
  );
  if (variante === "icono") return <span className={cn("inline-flex", className)}>{img}</span>;

  const nombre = tono === "claro" ? "text-brand-deep" : "text-on-brand";
  const sub = tono === "claro" ? "text-brand-vivid" : "text-brand-lilac";

  return (
    <span
      className={cn(
        "inline-flex items-center",
        variante === "vertical" ? "flex-col gap-2 text-center" : "gap-2.5",
        className,
      )}
      aria-label="Domicilio Independiente Don Alex"
    >
      {img}
      <span className="flex flex-col leading-none">
        <span
          className={cn("font-display font-extrabold tracking-tight", nombre)}
          style={{ fontSize: tamano * (variante === "vertical" ? 0.5 : 0.46) }}
        >
          DON ALEX
        </span>
        <span
          className={cn("mt-1 font-sans font-bold uppercase tracking-[0.22em]", sub)}
          style={{ fontSize: Math.max(8, tamano * 0.17) }}
        >
          Domicilio independiente
        </span>
      </span>
    </span>
  );
}
