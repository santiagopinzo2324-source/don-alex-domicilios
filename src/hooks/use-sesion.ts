import { queryOptions, useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Rol = Database["public"]["Enums"]["app_role"];

export interface Sesion {
  userId: string;
  email: string | null;
  roles: Rol[];
}

export const sesionQuery = queryOptions({
  queryKey: ["sesion"],
  queryFn: async (): Promise<Sesion | null> => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (error) throw error;
    return { userId: user.id, email: user.email ?? null, roles: (roles ?? []).map((r) => r.role) };
  },
  staleTime: 60_000,
});

/** Sesión actual en el navegador (durante el render del servidor siempre es "cargando"). */
export function useSesion() {
  return useQuery({ ...sesionQuery, enabled: typeof window !== "undefined" });
}
