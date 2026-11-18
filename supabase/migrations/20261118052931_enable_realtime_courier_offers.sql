do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pedido_ofertas_domiciliarios'
  ) then
    alter publication supabase_realtime add table public.pedido_ofertas_domiciliarios;
  end if;
end
$$;