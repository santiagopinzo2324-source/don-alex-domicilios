import { z } from "zod";

/** Celular colombiano: 10 dígitos que empiezan por 3 (se aceptan espacios y prefijo +57). */
export function normalizarCelular(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return digitos.startsWith("57") && digitos.length === 12 ? digitos.slice(2) : digitos;
}

export const esquemaCelular = z
  .string()
  .trim()
  .transform(normalizarCelular)
  .refine((v) => /^3\d{9}$/.test(v), "Escribe un celular de 10 dígitos que empiece por 3");

export const esquemaRegistroCliente = z.object({
  nombre_completo: z.string().trim().min(3, "Escribe tu nombre completo").max(100),
  email: z.string().trim().email("Correo no válido").max(255),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  tipo_cuenta: z.literal("cliente"),
});

export const esquemaRegistro = z.object({
  nombre_completo: z.string().trim().min(3, "Escribe tu nombre completo").max(100),
  telefono: esquemaCelular,
  email: z.string().trim().email("Correo no válido").max(255),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  tipo_cuenta: z.enum(["cliente", "domiciliario", "restaurante"]),
});

export const esquemaIngreso = z.object({
  email: z.string().trim().email("Correo no válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const esquemaDireccion = z.object({
  etiqueta: z.string().trim().min(1, "Ponle un nombre, por ejemplo Casa").max(40),
  direccion: z.string().trim().min(5, "Escribe la dirección completa").max(200),
  barrio: z.string().trim().max(80).optional().or(z.literal("")),
  referencia: z.string().trim().max(200).optional().or(z.literal("")),
});
