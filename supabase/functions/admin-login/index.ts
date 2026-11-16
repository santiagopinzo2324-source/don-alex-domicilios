import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@admin.donalex.invalid";

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return response({ error: "Método no permitido." }, 405);

  try {
    const expectedPassword = Deno.env.get("ADMIN_PASSWORD");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    const legacyAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const legacyService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!expectedPassword || !supabaseUrl) {
      console.error("Falta ADMIN_PASSWORD o SUPABASE_URL en los secretos.");
      return response({ error: "El acceso administrativo aún no está configurado." }, 503);
    }

    let publishableKey = legacyAnon ?? "";
    let serviceKey = legacyService ?? "";
    if (publishableKeysRaw) {
      const keys = JSON.parse(publishableKeysRaw);
      publishableKey = keys.default ?? publishableKey;
    }
    if (secretKeysRaw) {
      const keys = JSON.parse(secretKeysRaw);
      serviceKey = keys.default ?? serviceKey;
    }
    if (!publishableKey || !serviceKey) {
      console.error("No están disponibles las claves de servidor/publicación.");
      return response({ error: "La autenticación administrativa no está configurada." }, 503);
    }

    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (username !== "alex" || password.length === 0 || password !== expectedPassword) {
      return response({ error: "Usuario o contraseña incorrectos." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const publicClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) {
      console.error("No se pudo consultar el usuario administrativo:", listError.message);
      return response({ error: "No fue posible preparar el acceso. Intenta de nuevo." }, 500);
    }

    let user = listed.users.find((candidate) => candidate.email === ADMIN_EMAIL);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: expectedPassword,
        email_confirm: true,
      });
      if (error || !data.user) {
        console.error("No se pudo crear la cuenta interna:", error?.message);
        return response({ error: "No fue posible preparar la cuenta administrativa." }, 500);
      }
      user = data.user;
    } else {
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        password: expectedPassword,
        email_confirm: true,
      });
      if (error) {
        console.error("No se pudo sincronizar la cuenta interna:", error.message);
        return response({ error: "No fue posible preparar la cuenta administrativa." }, 500);
      }
    }

    const { data: existingRole, error: roleReadError } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleReadError) {
      console.error("No se pudo verificar el rol administrativo:", roleReadError.message);
      return response({ error: "No fue posible verificar los permisos administrativos." }, 500);
    }
    if (!existingRole) {
      const { error } = await admin.from("user_roles").insert({ user_id: user.id, role: "admin" });
      if (error) {
        console.error("No se pudo asignar el rol administrativo:", error.message);
        return response({ error: "No fue posible habilitar los permisos administrativos." }, 500);
      }
    }

    const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: expectedPassword,
    });
    if (signInError || !signedIn.session) {
      console.error("No se pudo crear la sesión administrativa:", signInError?.message);
      return response({ error: "No fue posible iniciar la sesión administrativa." }, 500);
    }

    return response({
      access_token: signedIn.session.access_token,
      refresh_token: signedIn.session.refresh_token,
      expires_in: signedIn.session.expires_in,
      token_type: signedIn.session.token_type,
    });
  } catch (error) {
    console.error("Error inesperado en admin-login:", error);
    return response({ error: "Ocurrió un error al verificar el acceso." }, 500);
  }
});
