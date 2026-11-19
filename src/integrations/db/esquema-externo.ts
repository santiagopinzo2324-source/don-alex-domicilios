/**
 * Tipos de las tablas que existen en la base de datos de Don Alex pero que no
 * aparecen en los tipos generados automáticamente (ese archivo se rehace solo y
 * borra cualquier cambio manual). Usa `db` en lugar de `supabase` cuando
 * consultes estas tablas o columnas.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type Publico = Database["public"];
type Tablas = Publico["Tables"];
type Domiciliarios = Tablas["domiciliarios"];

type TablasExtra = {
  domiciliarios: {
    Row: Domiciliarios["Row"] & { numero: number };
    Insert: Domiciliarios["Insert"] & { numero?: number };
    Update: Domiciliarios["Update"] & { numero?: number };
    Relationships: Domiciliarios["Relationships"];
  };
  reglas_cobertura: {
    Row: {
      activa: boolean;
      created_at: string;
      hora_limite: string | null;
      id: string;
      mensaje_cliente: string;
      nombre: string;
      poligono: Json;
      servicio_disponible: boolean;
      updated_at: string;
    };
    Insert: {
      activa?: boolean;
      created_at?: string;
      hora_limite?: string | null;
      id?: string;
      mensaje_cliente: string;
      nombre: string;
      poligono?: Json;
      servicio_disponible?: boolean;
      updated_at?: string;
    };
    Update: Partial<TablasExtra["reglas_cobertura"]["Row"]>;
    Relationships: [];
  };
  codigos_recogida: {
    Row: { pedido_id: string; cliente_id: string; codigo: string | null };
    Insert: { pedido_id: string; cliente_id: string; codigo?: string | null };
    Update: Partial<TablasExtra["codigos_recogida"]["Row"]>;
    Relationships: [];
  };
};

export type DatabaseCompleta = Omit<Database, "public"> & {
  public: Omit<Publico, "Tables"> & { Tables: Omit<Tablas, keyof TablasExtra> & TablasExtra };
};

export const db = supabase as unknown as SupabaseClient<DatabaseCompleta>;
