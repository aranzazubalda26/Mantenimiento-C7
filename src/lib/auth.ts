import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/usuarios";

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  // null = sin perfil o desactivado: la base (RLS) no le da acceso a nada
  rol: Rol | null;
};

// Usuario logueado verificado (getClaims valida la firma del token).
// El rol sale de la tabla perfiles, no del token. Sin sesion redirige a /login.
export async function getUsuario(): Promise<Usuario> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, apellido, rol, activo")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: claims.email ?? "",
    nombre: perfil?.nombre ?? "",
    apellido: perfil?.apellido ?? "",
    rol: perfil?.activo ? (perfil.rol as Rol) : null,
  };
}

export async function requireAdmin(): Promise<Usuario> {
  const usuario = await getUsuario();
  if (usuario.rol !== "admin") redirect("/");
  return usuario;
}

export function puedeCrearOrdenes(usuario: Usuario) {
  return usuario.rol === "admin" || usuario.rol === "inspector";
}
