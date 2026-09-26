// Valores validos: deben coincidir con el CHECK de la tabla perfiles.

export const ROLES = ["admin", "supervisor", "inspector"] as const;
export type Rol = (typeof ROLES)[number];

export const ROL_LABEL: Record<Rol, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  inspector: "Inspector",
};

export const MIN_PASSWORD = 8;

export function esRol(v: unknown): v is Rol {
  return ROLES.includes(v as Rol);
}

export function nombreCompleto(p: { nombre: string; apellido: string } | null | undefined) {
  return p ? `${p.nombre} ${p.apellido}` : "";
}
