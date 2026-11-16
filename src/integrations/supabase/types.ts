export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          activa: boolean
          nombre: string
          orden: number
          restringida: boolean
          slug: string
        }
        Insert: {
          activa?: boolean
          nombre: string
          orden?: number
          restringida?: boolean
          slug: string
        }
        Update: {
          activa?: boolean
          nombre?: string
          orden?: number
          restringida?: boolean
          slug?: string
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          comision_domiciliario: number
          hora_apertura: string
          hora_cierre: string
          horario: string
          id: number
          politicas: string | null
          tarifa_alejada: number
          tarifa_rural: number
          tarifa_urbana: number
          updated_at: string
          whatsapp: string
        }
        Insert: {
          comision_domiciliario?: number
          hora_apertura?: string
          hora_cierre?: string
          horario?: string
          id?: number
          politicas?: string | null
          tarifa_alejada?: number
          tarifa_rural?: number
          tarifa_urbana?: number
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          comision_domiciliario?: number
          hora_apertura?: string
          hora_cierre?: string
          horario?: string
          id?: number
          politicas?: string | null
          tarifa_alejada?: number
          tarifa_rural?: number
          tarifa_urbana?: number
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      direcciones: {
        Row: {
          barrio: string | null
          cliente_id: string
          created_at: string
          direccion: string
          es_principal: boolean
          etiqueta: string
          id: string
          lat: number | null
          lng: number | null
          referencia: string | null
        }
        Insert: {
          barrio?: string | null
          cliente_id: string
          created_at?: string
          direccion: string
          es_principal?: boolean
          etiqueta?: string
          id?: string
          lat?: number | null
          lng?: number | null
          referencia?: string | null
        }
        Update: {
          barrio?: string | null
          cliente_id?: string
          created_at?: string
          direccion?: string
          es_principal?: boolean
          etiqueta?: string
          id?: string
          lat?: number | null
          lng?: number | null
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      domiciliarios: {
        Row: {
          created_at: string
          numero: number
          disponible: boolean
          documento_identidad: string | null
          estado: Database["public"]["Enums"]["estado_registro"]
          licencia_vigente: boolean
          placa: string | null
          soat_vigente: boolean
          updated_at: string
          user_id: string
          vehiculo: string
        }
        Insert: {
          created_at?: string
          numero?: number
          disponible?: boolean
          documento_identidad?: string | null
          estado?: Database["public"]["Enums"]["estado_registro"]
          licencia_vigente?: boolean
          placa?: string | null
          soat_vigente?: boolean
          updated_at?: string
          user_id: string
          vehiculo?: string
        }
        Update: {
          created_at?: string
          numero?: number
          disponible?: boolean
          documento_identidad?: string | null
          estado?: Database["public"]["Enums"]["estado_registro"]
          licencia_vigente?: boolean
          placa?: string | null
          soat_vigente?: boolean
          updated_at?: string
          user_id?: string
          vehiculo?: string
        }
        Relationships: [
          {
            foreignKeyName: "domiciliarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      establecimientos: {
        Row: {
          abierto: boolean
          barrio: string | null
          categoria_slug: string
          created_at: string
          descripcion: string | null
          destacado: boolean
          direccion: string
          estado: Database["public"]["Enums"]["estado_registro"]
          horario: Json
          id: string
          lat: number | null
          lng: number | null
          logo_url: string | null
          nombre: string
          portada_url: string | null
          propietario_id: string | null
          slug: string
          telefono: string | null
          updated_at: string
          venta_licor_autorizada: boolean
        }
        Insert: {
          abierto?: boolean
          barrio?: string | null
          categoria_slug: string
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          direccion: string
          estado?: Database["public"]["Enums"]["estado_registro"]
          horario?: Json
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          nombre: string
          portada_url?: string | null
          propietario_id?: string | null
          slug: string
          telefono?: string | null
          updated_at?: string
          venta_licor_autorizada?: boolean
        }
        Update: {
          abierto?: boolean
          barrio?: string | null
          categoria_slug?: string
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          direccion?: string
          estado?: Database["public"]["Enums"]["estado_registro"]
          horario?: Json
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          nombre?: string
          portada_url?: string | null
          propietario_id?: string | null
          slug?: string
          telefono?: string | null
          updated_at?: string
          venta_licor_autorizada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "establecimientos_categoria_slug_fkey"
            columns: ["categoria_slug"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "establecimientos_propietario_id_fkey"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metodos_pago: {
        Row: {
          activo: boolean
          codigo: string
          instrucciones: string | null
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          codigo: string
          instrucciones?: string | null
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          codigo?: string
          instrucciones?: string | null
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          created_at: string
          cuerpo: string | null
          id: string
          leida: boolean
          pedido_id: string | null
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cuerpo?: string | null
          id?: string
          leida?: boolean
          pedido_id?: string | null
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          cuerpo?: string | null
          id?: string
          leida?: boolean
          pedido_id?: string | null
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_eventos: {
        Row: {
          actor_id: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_pedido"] | null
          id: string
          nota: string | null
          pedido_id: string
          tipo: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pedido"] | null
          id?: string
          nota?: string | null
          pedido_id: string
          tipo?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pedido"] | null
          id?: string
          nota?: string | null
          pedido_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_eventos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_items: {
        Row: {
          cantidad: number
          id: string
          nombre: string
          notas: string | null
          pedido_id: string
          precio_unitario: number
          producto_id: string | null
        }
        Insert: {
          cantidad: number
          id?: string
          nombre: string
          notas?: string | null
          pedido_id: string
          precio_unitario: number
          producto_id?: string | null
        }
        Update: {
          cantidad?: number
          id?: string
          nombre?: string
          notas?: string | null
          pedido_id?: string
          precio_unitario?: number
          producto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          asignado_at: string | null
          canal: Database["public"]["Enums"]["canal_pedido"]
          cliente_id: string | null
          cliente_nombre: string
          cliente_telefono: string
          comision_empresa: number | null
          creado_por: string | null
          created_at: string
          descripcion: string | null
          domiciliario_id: string | null
          entrega_barrio: string | null
          entrega_direccion: string
          entrega_lat: number | null
          entrega_lng: number | null
          entrega_referencia: string | null
          entregado_at: string | null
          establecimiento_id: string | null
          establecimiento_nombre: string | null
          estado: Database["public"]["Enums"]["estado_pedido"]
          estado_tarifa: Database["public"]["Enums"]["estado_tarifa"]
          id: string
          metodo_pago: string | null
          motivo_cancelacion: string | null
          numero: number
          observaciones: string | null
          pago_domiciliario: number | null
          pago_domiciliario_liquidado: boolean
          recogida_direccion: string | null
          recogida_lat: number | null
          recogida_lng: number | null
          subtotal_productos: number
          tiempo_preparacion_min: number | null
          tipo_servicio: Database["public"]["Enums"]["tipo_servicio"]
          total: number
          updated_at: string
          valor_domicilio: number | null
          zona_tipo: Database["public"]["Enums"]["tipo_zona"] | null
        }
        Insert: {
          asignado_at?: string | null
          canal?: Database["public"]["Enums"]["canal_pedido"]
          cliente_id?: string | null
          cliente_nombre: string
          cliente_telefono: string
          comision_empresa?: number | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          domiciliario_id?: string | null
          entrega_barrio?: string | null
          entrega_direccion: string
          entrega_lat?: number | null
          entrega_lng?: number | null
          entrega_referencia?: string | null
          entregado_at?: string | null
          establecimiento_id?: string | null
          establecimiento_nombre?: string | null
          estado?: Database["public"]["Enums"]["estado_pedido"]
          estado_tarifa?: Database["public"]["Enums"]["estado_tarifa"]
          id?: string
          metodo_pago?: string | null
          motivo_cancelacion?: string | null
          numero?: never
          observaciones?: string | null
          pago_domiciliario?: number | null
          pago_domiciliario_liquidado?: boolean
          recogida_direccion?: string | null
          recogida_lat?: number | null
          recogida_lng?: number | null
          subtotal_productos?: number
          tiempo_preparacion_min?: number | null
          tipo_servicio?: Database["public"]["Enums"]["tipo_servicio"]
          total?: number
          updated_at?: string
          valor_domicilio?: number | null
          zona_tipo?: Database["public"]["Enums"]["tipo_zona"] | null
        }
        Update: {
          asignado_at?: string | null
          canal?: Database["public"]["Enums"]["canal_pedido"]
          cliente_id?: string | null
          cliente_nombre?: string
          cliente_telefono?: string
          comision_empresa?: number | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          domiciliario_id?: string | null
          entrega_barrio?: string | null
          entrega_direccion?: string
          entrega_lat?: number | null
          entrega_lng?: number | null
          entrega_referencia?: string | null
          entregado_at?: string | null
          establecimiento_id?: string | null
          establecimiento_nombre?: string | null
          estado?: Database["public"]["Enums"]["estado_pedido"]
          estado_tarifa?: Database["public"]["Enums"]["estado_tarifa"]
          id?: string
          metodo_pago?: string | null
          motivo_cancelacion?: string | null
          numero?: never
          observaciones?: string | null
          pago_domiciliario?: number | null
          pago_domiciliario_liquidado?: boolean
          recogida_direccion?: string | null
          recogida_lat?: number | null
          recogida_lng?: number | null
          subtotal_productos?: number
          tiempo_preparacion_min?: number | null
          tipo_servicio?: Database["public"]["Enums"]["tipo_servicio"]
          total?: number
          updated_at?: string
          valor_domicilio?: number | null
          zona_tipo?: Database["public"]["Enums"]["tipo_zona"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_domiciliario_id_fkey"
            columns: ["domiciliario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_establecimiento_id_fkey"
            columns: ["establecimiento_id"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_metodo_pago_fkey"
            columns: ["metodo_pago"]
            isOneToOne: false
            referencedRelation: "metodos_pago"
            referencedColumns: ["codigo"]
          },
        ]
      }
      productos: {
        Row: {
          created_at: string
          descripcion: string | null
          disponible: boolean
          establecimiento_id: string
          foto_url: string | null
          id: string
          nombre: string
          orden: number
          precio: number
          seccion: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          disponible?: boolean
          establecimiento_id: string
          foto_url?: string | null
          id?: string
          nombre: string
          orden?: number
          precio: number
          seccion?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          disponible?: boolean
          establecimiento_id?: string
          foto_url?: string | null
          id?: string
          nombre?: string
          orden?: number
          precio?: number
          seccion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_establecimiento_id_fkey"
            columns: ["establecimiento_id"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nombre_completo: string
          telefono: string | null
          tipo_cuenta_solicitada: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nombre_completo?: string
          telefono?: string | null
          tipo_cuenta_solicitada?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre_completo?: string
          telefono?: string | null
          tipo_cuenta_solicitada?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      registro_actividad: {
        Row: {
          accion: string
          actor_id: string | null
          created_at: string
          detalle: Json
          entidad: string | null
          entidad_id: string | null
          id: string
        }
        Insert: {
          accion: string
          actor_id?: string | null
          created_at?: string
          detalle?: Json
          entidad?: string | null
          entidad_id?: string | null
          id?: string
        }
        Update: {
          accion?: string
          actor_id?: string | null
          created_at?: string
          detalle?: Json
          entidad?: string | null
          entidad_id?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      reglas_cobertura: {
        Row: {
          activa: boolean
          created_at: string
          hora_limite: string | null
          id: string
          mensaje_cliente: string
          nombre: string
          poligono: Json
          servicio_disponible: boolean
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          hora_limite?: string | null
          id?: string
          mensaje_cliente: string
          nombre: string
          poligono?: Json
          servicio_disponible?: boolean
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          hora_limite?: string | null
          id?: string
          mensaje_cliente?: string
          nombre?: string
          poligono?: Json
          servicio_disponible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      zonas: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          nombre: string
          poligono: Json
          prioridad: number
          tipo: Database["public"]["Enums"]["tipo_zona"]
          updated_at: string
          valor_excepcion: number | null
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre: string
          poligono?: Json
          prioridad?: number
          tipo: Database["public"]["Enums"]["tipo_zona"]
          updated_at?: string
          valor_excepcion?: number | null
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre?: string
          poligono?: Json
          prioridad?: number
          tipo?: Database["public"]["Enums"]["tipo_zona"]
          updated_at?: string
          valor_excepcion?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      es_admin: { Args: never; Returns: boolean }
      es_domiciliario_activo: { Args: never; Returns: boolean }
      es_propietario_establecimiento: {
        Args: { _establecimiento_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cliente" | "domiciliario" | "restaurante"
      canal_pedido: "web" | "whatsapp" | "telefono" | "restaurante" | "manual"
      estado_pedido:
        | "recibido"
        | "confirmado"
        | "en_preparacion"
        | "listo"
        | "asignado"
        | "hacia_recogida"
        | "recogido"
        | "hacia_entrega"
        | "entregado"
        | "finalizado"
        | "cancelado"
      estado_registro: "pendiente" | "activo" | "suspendido"
      estado_tarifa: "ok" | "revision"
      tipo_servicio:
        | "restaurante"
        | "domicilio"
        | "compra"
        | "recogida"
        | "mandado"
      tipo_zona: "urbana" | "alejada" | "rural" | "especial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "cliente", "domiciliario", "restaurante"],
      canal_pedido: ["web", "whatsapp", "telefono", "restaurante", "manual"],
      estado_pedido: [
        "recibido",
        "confirmado",
        "en_preparacion",
        "listo",
        "asignado",
        "hacia_recogida",
        "recogido",
        "hacia_entrega",
        "entregado",
        "finalizado",
        "cancelado",
      ],
      estado_registro: ["pendiente", "activo", "suspendido"],
      estado_tarifa: ["ok", "revision"],
      tipo_servicio: [
        "restaurante",
        "domicilio",
        "compra",
        "recogida",
        "mandado",
      ],
      tipo_zona: ["urbana", "alejada", "rural", "especial"],
    },
  },
} as const
