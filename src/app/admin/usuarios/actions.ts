"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MIN_PASSWORD, esRol, type Rol } from "@/lib/usuarios";

// Los perfiles no tienen policies de escritura: todo pasa por aca con service_role,
// siempre despues de verificar que quien llama es admin.

export type UsuarioForm = {
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol | "";
};

export type CrearUsuarioState = {
  error: string | null;
  valores: UsuarioForm;
  // Credenciales para mostrarle al admin una sola vez, recien creado
  creado: { nombre: string; email: string; password: string } | null;
  // Cambia en cada respuesta: el formulario lo usa como key para re-montar
  // los campos con `valores` (React resetea el form y los <select> pierden lo elegido)
  intento: number;
};

export type SimpleState = { error: string | null; ok: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function limpiar(s: FormDataEntryValue | null) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

// Mensajes de los triggers de la base (errcode 22023) ya estan pensados para el usuario
function mensajeDb(error: { code?: string; message: string }) {
  if (error.code === "22023") return error.message;
  console.error(error);
  return "No se pudo guardar. Probá de nuevo.";
}

function revalidar() {
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/escuelas");
}

export async function crearUsuario(
  prev: CrearUsuarioState,
  formData: FormData,
): Promise<CrearUsuarioState> {
  await requireAdmin();
  const valores: UsuarioForm = {
    nombre: limpiar(formData.get("nombre")),
    apellido: limpiar(formData.get("apellido")),
    email: limpiar(formData.get("email")).toLowerCase(),
    rol: esRol(formData.get("rol")) ? (formData.get("rol") as Rol) : "",
  };
  const password = String(formData.get("password") ?? "");
  const intento = prev.intento + 1;
  const falla = (error: string) => ({ error, valores, creado: null, intento });

  if (!valores.nombre || !valores.apellido) return falla("Completá nombre y apellido.");
  if (!EMAIL_RE.test(valores.email)) return falla("El email no es válido.");
  if (!valores.rol) return falla("Elegí un rol.");
  if (password.length < MIN_PASSWORD) {
    return falla(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: valores.email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (error.code === "email_exists") return falla("Ya existe un usuario con ese email.");
    if (error.code === "weak_password") return falla("La contraseña es muy débil. Probá con otra.");
    console.error("createUser:", error);
    return falla("No se pudo crear el usuario. Probá de nuevo.");
  }

  const { error: errPerfil } = await supabase.from("perfiles").insert({
    id: data.user.id,
    nombre: valores.nombre,
    apellido: valores.apellido,
    email: valores.email,
    rol: valores.rol,
  });
  if (errPerfil) {
    // Sin perfil el usuario no sirve: deshacer el alta
    await supabase.auth.admin.deleteUser(data.user.id);
    return falla(mensajeDb(errPerfil));
  }

  revalidar();
  return {
    error: null,
    valores: { nombre: "", apellido: "", email: "", rol: "" },
    creado: { nombre: `${valores.nombre} ${valores.apellido}`, email: valores.email, password },
    intento,
  };
}

export async function editarUsuario(
  id: string,
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const admin = await requireAdmin();
  const nombre = limpiar(formData.get("nombre"));
  const apellido = limpiar(formData.get("apellido"));
  const rol = formData.get("rol");

  if (!nombre || !apellido) return { error: "Completá nombre y apellido.", ok: false };
  if (!esRol(rol)) return { error: "Elegí un rol.", ok: false };
  if (id === admin.id && rol !== "admin") {
    return { error: "No podés quitarte el rol de admin a vos mismo.", ok: false };
  }

  const { error } = await createAdminClient()
    .from("perfiles")
    .update({ nombre, apellido, rol })
    .eq("id", id);
  if (error) return { error: mensajeDb(error), ok: false };

  revalidar();
  revalidatePath("/");
  return { error: null, ok: true };
}

export async function cambiarPassword(
  id: string,
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) {
    return { error: `Mínimo ${MIN_PASSWORD} caracteres.`, ok: false };
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password });
  if (error) {
    console.error("cambiarPassword:", error);
    return {
      error: error.code === "weak_password" ? "La contraseña es muy débil." : "No se pudo cambiar la contraseña.",
      ok: false,
    };
  }
  return { error: null, ok: true };
}

// Desactivar = perfil inactivo (la base le corta el acceso) + bloqueo del login.
export async function cambiarActivo(id: string, activo: boolean): Promise<SimpleState> {
  const admin = await requireAdmin();
  if (id === admin.id && !activo) {
    return { error: "No podés desactivarte a vos mismo.", ok: false };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("perfiles").update({ activo }).eq("id", id);
  if (error) return { error: mensajeDb(error), ok: false };

  const { error: errBan } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: activo ? "none" : "876000h", // ~100 años
  });
  if (errBan) {
    console.error("ban:", errBan);
    await supabase.from("perfiles").update({ activo: !activo }).eq("id", id);
    return { error: "No se pudo actualizar el acceso del usuario.", ok: false };
  }

  revalidar();
  return { error: null, ok: true };
}
