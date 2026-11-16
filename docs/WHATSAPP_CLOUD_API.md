# Activar WhatsApp Cloud API para Don Alex

El código de integración está preparado, pero no puede recibir mensajes reales hasta que se configure una cuenta de Meta y se despliegue la función en el proyecto Supabase.

## Datos que debes configurar como secretos de Supabase
- `WHATSAPP_VERIFY_TOKEN`: cadena aleatoria creada para verificar el webhook.
- `WHATSAPP_ACCESS_TOKEN`: token de acceso de Meta; mantenerlo privado.
- `WHATSAPP_PHONE_NUMBER_ID`: identificador del número de WhatsApp Business en Meta.
- `WHATSAPP_APP_SECRET`: App Secret de la aplicación Meta; mantenerlo privado.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: Supabase suele proporcionar estos valores al entorno de Edge Functions. La service role key nunca debe ir al navegador ni a GitHub.

## Configuración en Meta
1. Crear o seleccionar una aplicación Meta de tipo Business y añadir WhatsApp.
2. Usar primero el número de prueba que Meta ofrece. El número de contacto de Don Alex (3118199006) no queda convertido automáticamente en número Cloud API por estar escrito en la configuración del proyecto.
3. Configurar la función desplegada como callback URL y el mismo verify token.
4. Suscribirse al campo `messages`.
5. Probar desde un teléfono autorizado por el entorno de prueba.
6. Antes de producción, registrar/verificar el número que se vaya a usar y completar los requisitos de Meta.

## Comportamiento inicial
- Verifica GET challenge y la firma HMAC SHA-256 de POST.
- Registra mensajes entrantes y salientes en las tablas de WhatsApp.
- Responde al saludo con un menú y guía inicial de solicitud.
- Reconoce solicitud de asesor y consulta básica de pedido.
- No crea automáticamente un pedido definitivo: falta completar el flujo de resumen, cálculo de tarifa y confirmación transaccional para evitar registrar solicitudes incompletas.

## Ventana y plantillas
La respuesta libre del bot se envía como respuesta a un mensaje entrante del usuario. Fuera de la ventana de atención de 24 horas iniciada/renovada por el usuario, la empresa debe iniciar el contacto con una plantilla aprobada por WhatsApp. No se implementa envío proactivo en esta primera integración.

## Despliegue
Desde la carpeta del proyecto, después de enlazar Supabase:
```bash
supabase secrets set WHATSAPP_VERIFY_TOKEN=... WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_APP_SECRET=...
supabase functions deploy whatsapp-webhook
```
Configurar el callback URL como:
`https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-webhook`

No subas los secretos a GitHub ni los compartas en el chat.
