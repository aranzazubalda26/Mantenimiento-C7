"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// Inicio rapido para desarrollo: usa DEV_LOGIN_EMAIL/DEV_LOGIN_PASSWORD de .env.local.
// En produccion no hace nada aunque se llame directamente.
export async function loginRapido(): Promise<LoginState> {
  const email = process.env.DEV_LOGIN_EMAIL;
  const password = process.env.DEV_LOGIN_PASSWORD;

  if (process.env.NODE_ENV !== "development" || !email || !password) {
    return { error: "El inicio rápido no está disponible.", email: "" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: mensajeDeError(error.code, error.message), email: "" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
