// Supabase Edge Function: WhatsApp Cloud API webhook
// Secrets required: WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN,
// WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. Never expose these in frontend or Git history.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function validSignature(raw: string, signature: string | null, secret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  const expected = `sha256=${hex}`;
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function sendText(to: string, body: string, env: { token: string; phoneId: string }) {
  const response = await fetch(`https://graph.facebook.com/v22.0/${env.phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
  return result;
}

function replyFor(text: string) {
  const value = text.trim().toLocaleLowerCase("es-CO");
  if (/^(hola|buenas|buenos|hey|menu|menú|inicio)$/i.test(value)) {
    return "¡Hola! 👋💜 Bienvenido a DOMICILIO INDEPENDIENTE DON ALEX.\nEstamos para ayudarte en Pitalito, Huila.\n\nResponde con el número del servicio:\n1. Pedir en un restaurante\n2. Solicitar un domicilio\n3. Realizar una compra\n4. Recoger un pedido\n5. Hacer un mandado\n6. Consultar mi pedido\n7. Hablar con un asesor\n\nNuestro horario es todos los días de 7:00 a. m. a 11:00 p. m.";
  }
  if (value === "7" || value.includes("asesor") || value.includes("persona")) {
    return "Claro 💜 Hemos registrado tu solicitud para atención de un asesor. En cuanto esté disponible te atenderá una persona. Si es urgente, indícanos brevemente qué necesitas.";
  }
  if (["1","2","3","4","5"].includes(value)) {
    const services: Record<string,string> = { "1":"pedido en restaurante", "2":"domicilio", "3":"compra", "4":"recogida", "5":"mandado" };
    return `Perfecto. Vamos a iniciar tu solicitud de ${services[value]}. 💜\nPor favor envíanos en un solo mensaje:\n• Nombre\n• Dirección de recogida (si aplica)\n• Dirección de entrega y barrio\n• Qué necesitas\n• Forma de pago\n\nLa tarifa urbana general es de $6.000 COP en Pitalito. Si el destino es rural o especial, un asesor confirmará el valor antes de aceptar. No enviaremos el pedido hasta que confirmes el resumen.`;
  }
  if (value === "6" || value.includes("estado") || value.includes("pedido")) {
    return "Para consultar tu pedido, envíanos el número de pedido. Si aún no lo tienes, escribe ASESOR y te ayudaremos. 💜";
  }
  return "Gracias por escribir a DON ALEX 💜. Para ver las opciones escribe MENÚ. Para atención de una persona escribe ASESOR.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === verifyToken && challenge) return new Response(challenge, { status: 200 });
    return json({ error: "Webhook verification failed" }, 403);
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";
  const raw = await req.text();
  if (!appSecret || !(await validSignature(raw, req.headers.get("x-hub-signature-256"), appSecret))) {
    return json({ error: "Invalid webhook signature" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
  if (!supabaseUrl || !serviceKey || !accessToken || !phoneId || !verifyToken) {
    return json({ error: "Webhook secrets are not configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        const value = change.value ?? {};
        for (const message of value.messages ?? []) {
          const from = String(message.from ?? "");
          if (!from || !message.id) continue;
          const contact = (value.contacts ?? []).find((c: any) => c.wa_id === from);
          const name = contact?.profile?.name ?? null;
          const body = message.text?.body ?? (message.type === "button" ? message.button?.text : null) ?? `Mensaje recibido (${message.type})`;
          const { data: conversation, error: convError } = await supabase.from("whatsapp_conversaciones").upsert({
            wa_id: from, nombre_contacto: name, ultimo_mensaje_at: new Date(Number(message.timestamp ?? Date.now()/1000) * 1000).toISOString(),
          }, { onConflict: "wa_id" }).select("id").single();
          if (convError) throw convError;

          const { error: msgError } = await supabase.from("whatsapp_mensajes").upsert({
            conversacion_id: conversation.id, wamid: message.id, direccion: "entrante",
            tipo: message.type ?? "unknown", contenido: body, payload: message,
          }, { onConflict: "wamid" });
          if (msgError) throw msgError;

          if (message.type === "text" || message.type === "button") {
            const answer = replyFor(String(body ?? ""));
            const sent = await sendText(from, answer, { token: accessToken, phoneId });
            const sentMessage = sent.messages?.[0];
            await supabase.from("whatsapp_mensajes").insert({
              conversacion_id: conversation.id, wamid: sentMessage?.id ?? null,
              direccion: "saliente", tipo: "text", contenido: answer, estado: "enviado", payload: sent,
            });
          }
        }
      }
    }
    return json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook processing error", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
