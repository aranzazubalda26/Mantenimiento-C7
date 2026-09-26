import type { Metadata } from "next";
import { IconoLlave } from "@/components/iconos";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión · Mantenimiento C7",
};

export default function LoginPage() {
  const loginRapido =
    process.env.NODE_ENV === "development" &&
    Boolean(process.env.DEV_LOGIN_EMAIL && process.env.DEV_LOGIN_PASSWORD);

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
          <LoginForm loginRapido={loginRapido} />
        </div>
      </div>
    </main>
  );
}
