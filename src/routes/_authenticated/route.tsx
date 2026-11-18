import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      // Los clientes pueden usar Mi cuenta sin registrarse: Supabase crea una identidad
      // anónima persistente en el almacenamiento local de este navegador/dispositivo.
      if (location.pathname === "/cuenta") {
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (error || !anon.user) {
          throw new Error(
            error?.message?.includes("Anonymous sign-ins are disabled")
              ? "El acceso privado sin registro aún no está habilitado en el servidor. Contacta a administración."
              : error?.message || "No fue posible iniciar una sesión privada para este dispositivo.",
          );
        }
        return { userId: anon.user.id };
      }
      // El panel administrativo tiene su propio acceso; domiciliarios y negocios usan ingreso normal.
      if (location.pathname.startsWith("/admin")) throw redirect({ to: "/administracion" });
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { userId: data.user.id };
  },
  component: () => <Outlet />,
});
