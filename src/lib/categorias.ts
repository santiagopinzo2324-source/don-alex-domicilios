import {
  Apple,
  Cake,
  Drumstick,
  EggFried,
  Ellipsis,
  Flower2,
  Hamburger,
  IceCreamCone,
  NotebookPen,
  Pill,
  Pizza,
  Popcorn,
  Sandwich,
  ShoppingCart,
  Soup,
  Store,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";

export interface Categoria {
  slug: string;
  nombre: string;
  icono: LucideIcon;
  /** Solo comercios autorizados y con verificación de mayoría de edad. */
  restringida?: boolean;
}

export const CATEGORIAS: Categoria[] = [
  { slug: "restaurantes", nombre: "Restaurantes", icono: UtensilsCrossed },
  { slug: "comidas-rapidas", nombre: "Comidas rápidas", icono: Popcorn },
  { slug: "hamburguesas", nombre: "Hamburguesas", icono: Hamburger },
  { slug: "perros-calientes", nombre: "Perros calientes", icono: Sandwich },
  { slug: "pizzerias", nombre: "Pizzerías", icono: Pizza },
  { slug: "pollo", nombre: "Pollo", icono: Drumstick },
  { slug: "desayunos", nombre: "Desayunos", icono: EggFried },
  { slug: "almuerzos", nombre: "Almuerzos", icono: Soup },
  { slug: "postres", nombre: "Postres", icono: Cake },
  { slug: "heladerias", nombre: "Heladerías", icono: IceCreamCone },
  { slug: "fruterias", nombre: "Fruterías", icono: Apple },
  { slug: "supermercados", nombre: "Supermercados", icono: ShoppingCart },
  { slug: "tiendas", nombre: "Tiendas", icono: Store },
  { slug: "farmacias", nombre: "Farmacias", icono: Pill },
  { slug: "floristerias", nombre: "Floristerías", icono: Flower2 },
  { slug: "papelerias", nombre: "Papelerías", icono: NotebookPen },
  { slug: "licorerias", nombre: "Licorerías", icono: Wine, restringida: true },
  { slug: "otros", nombre: "Otros", icono: Ellipsis },
];
