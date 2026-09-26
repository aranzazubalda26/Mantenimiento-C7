"use client";

import { useActionState, useState } from "react";
import {
  login,
  loginRapido as loginRapidoAction,
  type LoginState,
} from "./actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm({ loginRapido }: { loginRapido: boolean }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [rapidoState, rapidoAction, rapidoPending] = useActionState(
    loginRapidoAction,
    initialState,
  );
  const [verPassword, setVerPassword] = useState(false);
  const ocupado = pending || rapidoPending;

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={state.email}
            placeholder="nombre@ejemplo.com"
            className="input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={verPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="input pr-20"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-muted"
              aria-label={
                verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {verPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </div>

        {state.error && <Error mensaje={state.error} />}

        <button type="submit" disabled={ocupado} className="btn-primary mt-1 min-h-[50px]">
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      {loginRapido && (
        <form action={rapidoAction} className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            solo en desarrollo
            <span className="h-px flex-1 bg-border" />
          </div>
          {rapidoState.error && <Error mensaje={rapidoState.error} />}
          <button type="submit" disabled={ocupado} className="btn-dev">
            {rapidoPending ? "Ingresando…" : "⚡ Inicio rápido"}
          </button>
        </form>
      )}
    </div>
  );
}

function Error({ mensaje }: { mensaje: string }) {
  return (
    <p
      role="alert"
      className="rounded-[10px] bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger"
    >
      {mensaje}
    </p>
  );
}
