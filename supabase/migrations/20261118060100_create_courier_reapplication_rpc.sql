-- Add the RPC used by the courier portal's "Enviar nueva postulación" button.
create or replace function public.domiciliario_solicitar_reingreso()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.estado_registro;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para enviar una nueva postulación.';
  end if;

  select estado into v_estado
  from public.domiciliarios
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'No encontramos una cuenta de domiciliario asociada a este usuario.';
  end if;

  if v_estado not in (
    'retirado'::public.estado_registro,
    'rechazado'::public.estado_registro,
    'suspendido'::public.estado_registro
  ) then
    raise exception 'Solo puedes enviar una nueva postulación cuando tu cuenta está retirada, rechazada o suspendida.';
  end if;

  update public.domiciliarios
  set estado = 'pendiente'::public.estado_registro,
      disponible = false,
      updated_at = now()
  where user_id = auth.uid();

  update public.profiles
  set tipo_cuenta_solicitada = 'domiciliario'::public.app_role
  where id = auth.uid();

  delete from public.user_roles
  where user_id = auth.uid()
    and role = 'domiciliario'::public.app_role;

  insert into public.registro_actividad(actor_id, accion, entidad, entidad_id, detalle)
  values (
    auth.uid(),
    'reenviar_postulacion_domiciliario',
    'domiciliario',
    auth.uid()::text,
    jsonb_build_object('estado_anterior', v_estado, 'estado_nuevo', 'pendiente')
  );
end;
$$;

grant execute on function public.domiciliario_solicitar_reingreso() to authenticated;
