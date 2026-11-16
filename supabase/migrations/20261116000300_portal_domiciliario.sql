-- Portal operativo del domiciliario: solicitudes, asignación atómica y estados controlados.
create or replace function public.crear_solicitud_domiciliario()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.tipo_cuenta_solicitada = 'domiciliario' then
    insert into public.domiciliarios(user_id, estado, disponible)
    values (new.id, 'pendiente', false)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists crear_solicitud_domiciliario_profile on public.profiles;
create trigger crear_solicitud_domiciliario_profile
after insert on public.profiles for each row
execute function public.crear_solicitud_domiciliario();

-- Cubre perfiles ya creados antes de esta migración.
insert into public.domiciliarios(user_id, estado, disponible)
select p.id, 'pendiente', false
from public.profiles p
where p.tipo_cuenta_solicitada = 'domiciliario'
on conflict (user_id) do nothing;

drop policy if exists pedidos_available_for_couriers on public.pedidos;
create policy pedidos_available_for_couriers on public.pedidos
for select to authenticated
using (
  domiciliario_id is null
  and estado in ('listo','confirmado')
  and public.es_domiciliario_activo()
);

create or replace function public.domiciliario_disponibilidad(_disponible boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_domiciliario_activo() then
    raise exception 'Tu perfil de domiciliario aún no está aprobado.';
  end if;
  update public.domiciliarios
  set disponible = _disponible, updated_at = now()
  where user_id = auth.uid() and estado = 'activo';
end $$;

create or replace function public.domiciliario_aceptar_pedido(_pedido_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_count integer;
begin
  if not public.es_domiciliario_activo() then
    raise exception 'Tu perfil no está aprobado.';
  end if;
  if not exists (select 1 from public.domiciliarios d where d.user_id = auth.uid() and d.disponible and d.estado = 'activo') then
    raise exception 'Activa tu disponibilidad para recibir pedidos.';
  end if;
  update public.pedidos
  set domiciliario_id = auth.uid(), estado = 'asignado', asignado_at = now(), updated_at = now()
  where id = _pedido_id and domiciliario_id is null and estado in ('listo','confirmado');
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'Este pedido ya fue asignado o no está disponible.'; end if;
  insert into public.pedido_eventos(pedido_id, actor_id, tipo, estado, nota)
  values (_pedido_id, auth.uid(), 'asignacion', 'asignado', 'Pedido aceptado por el domiciliario');
end $$;

create or replace function public.domiciliario_actualizar_estado(_pedido_id uuid, _estado public.estado_pedido)
returns void language plpgsql security definer set search_path = public
as $$
declare v_actual public.estado_pedido;
begin
  if not public.es_domiciliario_activo() then raise exception 'Perfil no aprobado.'; end if;
  select estado into v_actual from public.pedidos
  where id = _pedido_id and domiciliario_id = auth.uid()
  for update;
  if not found then raise exception 'Pedido no encontrado.'; end if;
  if not (
    (v_actual = 'asignado' and _estado = 'hacia_recogida') or
    (v_actual = 'hacia_recogida' and _estado = 'recogido') or
    (v_actual = 'recogido' and _estado = 'hacia_entrega') or
    (v_actual = 'hacia_entrega' and _estado = 'entregado')
  ) then raise exception 'Ese cambio de estado no está permitido.'; end if;
  update public.pedidos
  set estado = _estado,
      entregado_at = case when _estado = 'entregado' then now() else entregado_at end,
      updated_at = now()
  where id = _pedido_id;
  insert into public.pedido_eventos(pedido_id, actor_id, tipo, estado)
  values (_pedido_id, auth.uid(), 'estado', _estado);
end $$;

grant execute on function public.domiciliario_disponibilidad(boolean) to authenticated;
grant execute on function public.domiciliario_aceptar_pedido(uuid) to authenticated;
grant execute on function public.domiciliario_actualizar_estado(uuid, public.estado_pedido) to authenticated;
