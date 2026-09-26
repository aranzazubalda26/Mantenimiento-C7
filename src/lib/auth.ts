import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "admin" | "inspector";

export type Usuario = {
  id: string;
  email: string;
  rol: Rol | null;
};

// Usuario logueado verificado (getClaims valida la firma del token).
// Sin sesion redirige a /login.
export async function getUsuario(): Promise<Usuario> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const rol = (claims.app_metadata as { role?: string } | undefined)?.role;
  return {
    id: claims.sub,
    email: claims.email ?? "",
    rol: rol === "admin" || rol === "inspector" ? rol : null,
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
