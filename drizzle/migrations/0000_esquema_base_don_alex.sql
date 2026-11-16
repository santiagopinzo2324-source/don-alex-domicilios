-- ===== Tipos =====
CREATE TYPE public.app_role AS ENUM ('admin', 'cliente', 'domiciliario', 'restaurante');
CREATE TYPE public.tipo_zona AS ENUM ('urbana', 'alejada', 'rural', 'especial');
CREATE TYPE public.estado_registro AS ENUM ('pendiente', 'activo', 'suspendido');
CREATE TYPE public.tipo_servicio AS ENUM ('restaurante', 'domicilio', 'compra', 'recogida', 'mandado');
CREATE TYPE public.canal_pedido AS ENUM ('web', 'whatsapp', 'telefono', 'restaurante', 'manual');
CREATE TYPE public.estado_pedido AS ENUM (
  'recibido', 'confirmado', 'en_preparacion', 'listo', 'asignado',
  'hacia_recogida', 'recogido', 'hacia_entrega', 'entregado', 'finalizado', 'cancelado'
);
CREATE TYPE public.estado_tarifa AS ENUM ('ok', 'revision');

-- ===== Utilidad updated_at =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ===== Perfiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo text NOT NULL DEFAULT '',
  telefono text,
  avatar_url text,
  tipo_cuenta_solicitada public.app_role NOT NULL DEFAULT 'cliente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY "Ver mis roles o admin ve todos" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es_admin());
CREATE POLICY "Admin asigna roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.es_admin());
CREATE POLICY "Admin quita roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.es_admin());

CREATE POLICY "Ver mi perfil o admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.es_admin());
CREATE POLICY "Crear mi perfil" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Editar mi perfil o admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.es_admin()) WITH CHECK (id = auth.uid() OR public.es_admin());

-- Perfil + rol cliente al registrarse. El tipo solicitado es informativo: no otorga privilegios.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  solicitado public.app_role := 'cliente';
BEGIN
  IF NEW.raw_user_meta_data->>'tipo_cuenta' IN ('domiciliario', 'restaurante') THEN
    solicitado := (NEW.raw_user_meta_data->>'tipo_cuenta')::public.app_role;
  END IF;
  INSERT INTO public.profiles (id, nombre_completo, telefono, tipo_cuenta_solicitada)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre_completo', ''), NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'telefono', ''),
    solicitado
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Direcciones de clientes =====
CREATE TABLE public.direcciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  etiqueta text NOT NULL DEFAULT 'Casa',
  direccion text NOT NULL,
  barrio text,
  referencia text,
  lat double precision,
  lng double precision,
  es_principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX direcciones_cliente_idx ON public.direcciones(cliente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direcciones TO authenticated;
GRANT ALL ON public.direcciones TO service_role;
ALTER TABLE public.direcciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mis direcciones" ON public.direcciones FOR ALL TO authenticated
  USING (cliente_id = auth.uid() OR public.es_admin())
  WITH CHECK (cliente_id = auth.uid() OR public.es_admin());

-- ===== Configuración general (una sola fila) =====
CREATE TABLE public.configuracion (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tarifa_urbana integer NOT NULL DEFAULT 6000 CHECK (tarifa_urbana > 0),
  tarifa_alejada integer NOT NULL DEFAULT 12000 CHECK (tarifa_alejada > 0),
  tarifa_rural integer NOT NULL DEFAULT 15000 CHECK (tarifa_rural > 0),
  comision_domiciliario numeric(5,4) NOT NULL DEFAULT 0.15 CHECK (comision_domiciliario >= 0 AND comision_domiciliario <= 1),
  whatsapp text NOT NULL DEFAULT '573118199006',
  horario text NOT NULL DEFAULT 'Todos los días · 7:00 a. m. – 11:00 p. m.',
  hora_apertura time NOT NULL DEFAULT '07:00',
  hora_cierre time NOT NULL DEFAULT '23:00',
  politicas text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.configuracion TO anon, authenticated;
GRANT UPDATE ON public.configuracion TO authenticated;
GRANT ALL ON public.configuracion TO service_role;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Configuración pública" ON public.configuracion FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin edita configuración" ON public.configuracion FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());
CREATE TRIGGER configuracion_updated_at BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.configuracion (id) VALUES (1);

-- ===== Medios de pago =====
CREATE TABLE public.metodos_pago (
  codigo text PRIMARY KEY,
  nombre text NOT NULL,
  instrucciones text,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.metodos_pago TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.metodos_pago TO authenticated;
GRANT ALL ON public.metodos_pago TO service_role;
ALTER TABLE public.metodos_pago ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medios de pago públicos" ON public.metodos_pago FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gestiona medios de pago" ON public.metodos_pago FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());
INSERT INTO public.metodos_pago (codigo, nombre, activo, orden) VALUES
  ('efectivo', 'Efectivo', true, 1),
  ('nequi', 'Nequi', true, 2),
  ('bancolombia', 'Bancolombia', true, 3),
  ('transferencia', 'Transferencia bancaria', true, 4),
  ('daviplata', 'Daviplata', false, 5);

-- ===== Zonas de tarifa =====
CREATE TABLE public.zonas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo public.tipo_zona NOT NULL,
  prioridad integer NOT NULL DEFAULT 1,
  poligono jsonb NOT NULL DEFAULT '[]'::jsonb,
  valor_excepcion integer CHECK (valor_excepcion IS NULL OR valor_excepcion > 0),
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zonas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.zonas TO authenticated;
GRANT ALL ON public.zonas TO service_role;
ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Zonas activas públicas" ON public.zonas FOR SELECT TO anon, authenticated USING (activa OR public.es_admin());
CREATE POLICY "Admin gestiona zonas" ON public.zonas FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());
CREATE TRIGGER zonas_updated_at BEFORE UPDATE ON public.zonas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Categorías =====
CREATE TABLE public.categorias (
  slug text PRIMARY KEY,
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  restringida boolean NOT NULL DEFAULT false,
  activa boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.categorias TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categorías públicas" ON public.categorias FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gestiona categorías" ON public.categorias FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());
INSERT INTO public.categorias (slug, nombre, orden, restringida) VALUES
  ('restaurantes', 'Restaurantes', 1, false), ('comidas-rapidas', 'Comidas rápidas', 2, false),
  ('hamburguesas', 'Hamburguesas', 3, false), ('perros-calientes', 'Perros calientes', 4, false),
  ('pizzerias', 'Pizzerías', 5, false), ('pollo', 'Pollo', 6, false),
  ('desayunos', 'Desayunos', 7, false), ('almuerzos', 'Almuerzos', 8, false),
  ('postres', 'Postres', 9, false), ('heladerias', 'Heladerías', 10, false),
  ('fruterias', 'Fruterías', 11, false), ('supermercados', 'Supermercados', 12, false),
  ('tiendas', 'Tiendas', 13, false), ('farmacias', 'Farmacias', 14, false),
  ('floristerias', 'Floristerías', 15, false), ('papelerias', 'Papelerías', 16, false),
  ('licorerias', 'Licorerías', 17, true), ('otros', 'Otros', 18, false);

-- ===== Establecimientos =====
CREATE TABLE public.establecimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propietario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  slug text NOT NULL UNIQUE,
  categoria_slug text NOT NULL REFERENCES public.categorias(slug),
  descripcion text,
  direccion text NOT NULL,
  barrio text,
  telefono text,
  lat double precision,
  lng double precision,
  logo_url text,
  portada_url text,
  horario jsonb NOT NULL DEFAULT '{}'::jsonb,
  abierto boolean NOT NULL DEFAULT true,
  destacado boolean NOT NULL DEFAULT false,
  venta_licor_autorizada boolean NOT NULL DEFAULT false,
  estado public.estado_registro NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX establecimientos_propietario_idx ON public.establecimientos(propietario_id);
CREATE INDEX establecimientos_categoria_idx ON public.establecimientos(categoria_slug);
GRANT SELECT ON public.establecimientos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.establecimientos TO authenticated;
GRANT ALL ON public.establecimientos TO service_role;
ALTER TABLE public.establecimientos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER establecimientos_updated_at BEFORE UPDATE ON public.establecimientos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.es_propietario_establecimiento(_establecimiento_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.establecimientos WHERE id = _establecimiento_id AND propietario_id = auth.uid())
$$;

CREATE POLICY "Establecimientos activos públicos" ON public.establecimientos FOR SELECT TO anon, authenticated
  USING (estado = 'activo' OR propietario_id = auth.uid() OR public.es_admin());
CREATE POLICY "Registrar mi establecimiento" ON public.establecimientos FOR INSERT TO authenticated
  WITH CHECK (propietario_id = auth.uid() OR public.es_admin());
CREATE POLICY "Editar mi establecimiento" ON public.establecimientos FOR UPDATE TO authenticated
  USING (propietario_id = auth.uid() OR public.es_admin())
  WITH CHECK (propietario_id = auth.uid() OR public.es_admin());
CREATE POLICY "Admin elimina establecimientos" ON public.establecimientos FOR DELETE TO authenticated
  USING (public.es_admin());

-- Solo el administrador cambia estado, destacado y autorización de licor.
CREATE OR REPLACE FUNCTION public.proteger_campos_establecimiento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.es_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.estado := 'pendiente';
      NEW.destacado := false;
      NEW.venta_licor_autorizada := false;
    ELSE
      NEW.estado := OLD.estado;
      NEW.destacado := OLD.destacado;
      NEW.venta_licor_autorizada := OLD.venta_licor_autorizada;
      NEW.propietario_id := OLD.propietario_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER establecimientos_proteger BEFORE INSERT OR UPDATE ON public.establecimientos
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_establecimiento();

-- ===== Productos =====
CREATE TABLE public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establecimiento_id uuid NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  precio integer NOT NULL CHECK (precio >= 0),
  foto_url text,
  seccion text,
  disponible boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX productos_establecimiento_idx ON public.productos(establecimiento_id);
GRANT SELECT ON public.productos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.productos TO authenticated;
GRANT ALL ON public.productos TO service_role;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Productos de establecimientos visibles" ON public.productos FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.establecimientos e WHERE e.id = establecimiento_id));
CREATE POLICY "Negocio gestiona sus productos" ON public.productos FOR ALL TO authenticated
  USING (public.es_propietario_establecimiento(establecimiento_id) OR public.es_admin())
  WITH CHECK (public.es_propietario_establecimiento(establecimiento_id) OR public.es_admin());

-- ===== Domiciliarios =====
CREATE TABLE public.domiciliarios (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehiculo text NOT NULL DEFAULT 'Motocicleta',
  placa text,
  documento_identidad text,
  licencia_vigente boolean NOT NULL DEFAULT false,
  soat_vigente boolean NOT NULL DEFAULT false,
  disponible boolean NOT NULL DEFAULT false,
  estado public.estado_registro NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.domiciliarios TO authenticated;
GRANT DELETE ON public.domiciliarios TO authenticated;
GRANT ALL ON public.domiciliarios TO service_role;
ALTER TABLE public.domiciliarios ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER domiciliarios_updated_at BEFORE UPDATE ON public.domiciliarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.es_domiciliario_activo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'domiciliario')
     AND EXISTS (SELECT 1 FROM public.domiciliarios WHERE user_id = auth.uid() AND estado = 'activo')
$$;

CREATE POLICY "Ver mi ficha o admin" ON public.domiciliarios FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es_admin());
CREATE POLICY "Crear mi ficha" ON public.domiciliarios FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.es_admin());
CREATE POLICY "Editar mi ficha o admin" ON public.domiciliarios FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.es_admin()) WITH CHECK (user_id = auth.uid() OR public.es_admin());
CREATE POLICY "Admin elimina fichas" ON public.domiciliarios FOR DELETE TO authenticated USING (public.es_admin());

CREATE OR REPLACE FUNCTION public.proteger_campos_domiciliario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.es_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.estado := 'pendiente';
      NEW.disponible := false;
    ELSE
      NEW.estado := OLD.estado;
      NEW.licencia_vigente := OLD.licencia_vigente;
      NEW.soat_vigente := OLD.soat_vigente;
      IF OLD.estado <> 'activo' THEN NEW.disponible := false; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER domiciliarios_proteger BEFORE INSERT OR UPDATE ON public.domiciliarios
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_domiciliario();

-- ===== Pedidos =====
CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE,
  canal public.canal_pedido NOT NULL DEFAULT 'web',
  tipo_servicio public.tipo_servicio NOT NULL DEFAULT 'domicilio',
  estado public.estado_pedido NOT NULL DEFAULT 'recibido',
  cliente_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cliente_nombre text NOT NULL,
  cliente_telefono text NOT NULL,
  establecimiento_id uuid REFERENCES public.establecimientos(id) ON DELETE SET NULL,
  establecimiento_nombre text,
  recogida_direccion text,
  recogida_lat double precision,
  recogida_lng double precision,
  entrega_direccion text NOT NULL,
  entrega_barrio text,
  entrega_referencia text,
  entrega_lat double precision,
  entrega_lng double precision,
  descripcion text,
  observaciones text,
  metodo_pago text REFERENCES public.metodos_pago(codigo),
  subtotal_productos integer NOT NULL DEFAULT 0 CHECK (subtotal_productos >= 0),
  valor_domicilio integer CHECK (valor_domicilio IS NULL OR valor_domicilio >= 0),
  zona_tipo public.tipo_zona,
  estado_tarifa public.estado_tarifa NOT NULL DEFAULT 'revision',
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0),
  domiciliario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  comision_empresa integer,
  pago_domiciliario integer,
  pago_domiciliario_liquidado boolean NOT NULL DEFAULT false,
  tiempo_preparacion_min integer,
  motivo_cancelacion text,
  creado_por uuid,
  asignado_at timestamptz,
  entregado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pedidos_cliente_idx ON public.pedidos(cliente_id);
CREATE INDEX pedidos_establecimiento_idx ON public.pedidos(establecimiento_id);
CREATE INDEX pedidos_domiciliario_idx ON public.pedidos(domiciliario_id);
CREATE INDEX pedidos_estado_idx ON public.pedidos(estado);
CREATE INDEX pedidos_created_idx ON public.pedidos(created_at DESC);
GRANT SELECT, UPDATE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Cliente ve sus pedidos" ON public.pedidos FOR SELECT TO authenticated
  USING (cliente_id = auth.uid());
CREATE POLICY "Negocio ve pedidos de su local" ON public.pedidos FOR SELECT TO authenticated
  USING (establecimiento_id IS NOT NULL AND public.es_propietario_establecimiento(establecimiento_id));
CREATE POLICY "Domiciliario ve asignados y disponibles" ON public.pedidos FOR SELECT TO authenticated
  USING (
    domiciliario_id = auth.uid()
    OR (
      domiciliario_id IS NULL
      AND estado IN ('recibido', 'confirmado', 'en_preparacion', 'listo')
      AND estado_tarifa = 'ok'
      AND public.es_domiciliario_activo()
    )
  );
CREATE POLICY "Admin ve todos los pedidos" ON public.pedidos FOR SELECT TO authenticated USING (public.es_admin());
CREATE POLICY "Admin edita pedidos" ON public.pedidos FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

-- ===== Productos del pedido =====
CREATE TABLE public.pedido_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  precio_unitario integer NOT NULL CHECK (precio_unitario >= 0),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  notas text
);
CREATE INDEX pedido_items_pedido_idx ON public.pedido_items(pedido_id);
GRANT SELECT ON public.pedido_items TO authenticated;
GRANT ALL ON public.pedido_items TO service_role;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver items de pedidos visibles" ON public.pedido_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id));

-- ===== Historial de estados =====
CREATE TABLE public.pedido_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estado public.estado_pedido,
  tipo text NOT NULL DEFAULT 'estado',
  nota text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pedido_eventos_pedido_idx ON public.pedido_eventos(pedido_id, created_at);
GRANT SELECT ON public.pedido_eventos TO authenticated;
GRANT ALL ON public.pedido_eventos TO service_role;
ALTER TABLE public.pedido_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver eventos de pedidos visibles" ON public.pedido_eventos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id));

-- ===== Notificaciones =====
CREATE TABLE public.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  cuerpo text,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notificaciones_user_idx ON public.notificaciones(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notificaciones TO authenticated;
GRANT ALL ON public.notificaciones TO service_role;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mis notificaciones" ON public.notificaciones FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Marcar mis notificaciones" ON public.notificaciones FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Borrar mis notificaciones" ON public.notificaciones FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== Registro de actividad administrativa =====
CREATE TABLE public.registro_actividad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  accion text NOT NULL,
  entidad text,
  entidad_id text,
  detalle jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX registro_actividad_created_idx ON public.registro_actividad(created_at DESC);
GRANT SELECT ON public.registro_actividad TO authenticated;
GRANT ALL ON public.registro_actividad TO service_role;
ALTER TABLE public.registro_actividad ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin ve registro" ON public.registro_actividad FOR SELECT TO authenticated USING (public.es_admin());

-- ===== Tiempo real =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;