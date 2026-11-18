-- Permite que cada domiciliario consulte únicamente sus propias ofertas.
-- Administración puede consultar todas las ofertas para supervisar el despacho.
create policy "pedido_ofertas_select_participantes"
on public.pedido_ofertas_domiciliarios
for select
to authenticated
using (
  domiciliario_id = (select auth.uid())
  or public.es_admin()
);
