-- Endurece la ejecución de funciones SECURITY DEFINER.
-- Las funciones de trigger no deben exponerse como RPC.
alter function public.touch_updated_at() set search_path = public;
revoke all on function public.admin_revisar_domiciliario(uuid, boolean) from public, anon;
revoke all on function public.crear_solicitud_domiciliario() from public, anon, authenticated;
revoke all on function public.domiciliario_aceptar_pedido(uuid) from public, anon;
revoke all on function public.domiciliario_actualizar_estado(uuid, public.estado_pedido) from public, anon;
revoke all on function public.domiciliario_disponibilidad(boolean) from public, anon;
revoke all on function public.es_admin() from public, anon;
revoke all on function public.es_domiciliario_activo() from public, anon;
revoke all on function public.es_propietario_establecimiento(uuid) from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;

grant execute on function public.admin_revisar_domiciliario(uuid, boolean) to authenticated;
grant execute on function public.domiciliario_aceptar_pedido(uuid) to authenticated;
grant execute on function public.domiciliario_actualizar_estado(uuid, public.estado_pedido) to authenticated;
grant execute on function public.domiciliario_disponibilidad(boolean) to authenticated;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.es_domiciliario_activo() to authenticated;
grant execute on function public.es_propietario_establecimiento(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;