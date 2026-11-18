-- Restore missing courier role for already-approved accounts and allow reapplication after withdrawal/rejection.
create or replace function public.crear_solicitud_domiciliario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo_cuenta_solicitada = 'domiciliario'::public.app_role then
    insert into public.domiciliarios (user_id, estado, disponible)
    values (new.id, 'pendiente'::public.estado_registro, false)
    on conflict (user_id) do update
      set estado = case
            when public.domiciliarios.estado in (
              'retirado'::public.estado_registro,
              'rechazado'::public.estado_registro
            ) then 'pendiente'::public.estado_registro
            else public.domiciliarios.estado
          end,
          disponible = case
            when public.domiciliarios.estado in (
              'retirado'::public.estado_registro,
              'rechazado'::public.estado_registro
            ) then false
            else public.domiciliarios.disponible
          end,
          updated_at = case
            when public.domiciliarios.estado in (
              'retirado'::public.estado_registro,
              'rechazado'::public.estado_registro
            ) then now()
            else public.domiciliarios.updated_at
          end;
  end if;
  return new;
end;
$$;

insert into public.user_roles (user_id, role)
select d.user_id, 'domiciliario'::public.app_role
from public.domiciliarios d
join public.profiles p on p.id = d.user_id
where d.estado = 'activo'::public.estado_registro
  and p.tipo_cuenta_solicitada = 'domiciliario'::public.app_role
on conflict (user_id, role) do nothing;
