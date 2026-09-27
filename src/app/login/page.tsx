import type { Metadata } from "next";
import { IconoLlave } from "@/components/iconos";
import type { Rol } from "@/lib/usuarios";
import { LoginForm, type UsuarioDev } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión · Mantenimiento C7",
};

const ORDEN_ROL: Record<Rol, number> = { admin: 0, supervisor: 1, inspector: 2 };

// Solo con `npm run dev`: usuarios activos para el inicio rapido sin contraseña
async function usuariosDev(): Promise<UsuarioDev[]> {
  if (process.env.NODE_ENV !== "development") return [];
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await createAdminClient()
    .from("perfiles")
    .select("id, nombre, apellido, rol")
    .eq("activo", true)
    .order("apellido");
  return ((data ?? []) as UsuarioDev[]).sort((a, b) => ORDEN_ROL[a.rol] - ORDEN_ROL[b.rol]);
}

export default async function LoginPage() {
  const usuarios = await usuariosDev();

  return (
    <main className="flex flex-1 flex-col justify-center px-4 py-12 sm:items-center">
      <div className="w-full sm:max-w-[400px]">
        <div className="mb-8 flex flex-col items-start gap-4 px-2 sm:items-center sm:text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-white">
            <IconoLlave className="size-6" />
          </span>
          <div>
            <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">Mantenimiento C7</h1>
            <p className="mt-1 text-muted">Iniciá sesión para continuar</p>
          </div>
        </div>

        <div className="tarjeta p-[18px] sm:p-6">
          <LoginForm usuariosDev={usuarios} />
        </div>
      </div>
    </main>
  );
}
