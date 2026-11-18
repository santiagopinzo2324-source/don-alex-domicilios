-- Corrige un efecto de 20261116000500_endurecer_funciones.sql:
-- al quitar es_admin() a visitantes sin sesión, las políticas públicas que la usan
-- (categorías, medios de pago, zonas, establecimientos, productos, reglas de cobertura)
-- fallan con "permission denied for function es_admin".
-- es_admin() solo devuelve verdadero para administradores; para visitantes siempre es falso.
grant execute on function public.es_admin() to anon;
