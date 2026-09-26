import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión · Mantenimiento C7",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12 sm:items-center">
      <div className="w-full sm:max-w-sm">
        <div className="mb-10 flex flex-col items-start gap-4 sm:items-center sm:text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-fg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7"
              aria-hidden
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Mantenimiento C7
            </h1>
            <p className="mt-1 text-muted">Iniciá sesión para continuar</p>
          </div>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
