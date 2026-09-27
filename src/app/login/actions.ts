"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null; email: string };

// Traduce los errores de Supabase Auth a mensajes para el usuario
function mensajeDeError(code: string | undefined, message: string) {
  switch (code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Tu email todavía no fue confirmado.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Demasiados intentos. Esperá unos minutos y volvé a probar.";
    case "user_banned":
      return "Este usuario está deshabilitado.";
    default:
      console.error("Error de login:", code, message);
      return "No se pudo iniciar sesión. Probá de nuevo.";
  }
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Completá email y contraseña.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: mensajeDeError(error.code, error.message), email };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// Inicio rapido para desarrollo: entra como cualquier usuario activo SIN contraseña.
// Genera el acceso con la API de administrador de Supabase (no manda mails).
// En produccion no hace nada aunque se llame directamente.
export async function entrarComo(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (process.env.NODE_ENV !== "development") {
    return { error: "El inicio rápido no está disponible.", email: "" };
  }
  const id = String(formData.get("usuario") ?? "");

  const admin = createAdminClient();
  const { data: perfil } = await admin.from("perfiles").select("email, activo").eq("id", id).maybeSingle();
  if (!perfil?.activo) return { error: "Ese usuario no existe o está desactivado.", email: "" };

  const { data: link, error: errLink } = await admin.auth.admin.generateLink({ type: "magiclink", email: perfil.email });
  if (errLink) {
    console.error("entrarComo:", errLink);
    return { error: "No se pudo generar el acceso.", email: "" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (error) return { error: mensajeDeError(error.code, error.message), email: "" };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
