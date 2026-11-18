create or replace function public.domiciliario_retirar_postulacion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.estado_registro;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para retirar tu postulación.';
  end if;

  select estado into v_estado
  from public.domiciliarios
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'No encontramos una postulación asociada a esta cuenta.';
  end if;

  if v_estado <> 'pendiente'::public.estado_registro then
    raise exception 'Solo puedes retirar una postulación que esté pendiente de revisión.';
  end if;

  update public.domiciliarios
  set estado = 'retirado'::public.estado_registro,
      disponible = false,
      updated_at = now()
  where user_id = auth.uid();

  insert into public.registro_actividad(actor_id, accion, entidad, entidad_id, detalle)
  values (
    auth.uid(),
    'retirar_postulacion_domiciliario',
    'domiciliario',
    auth.uid()::text,
    jsonb_build_object('estado_anterior', v_estado, 'estado_nuevo', 'retirado')
  );
end;
$$;

revoke all on function public.domiciliario_retirar_postulacion() from public, anon;
grant execute on function public.domiciliario_retirar_postulacion() to authenticated;
