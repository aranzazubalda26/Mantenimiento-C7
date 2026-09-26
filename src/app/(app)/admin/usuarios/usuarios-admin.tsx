"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { ErrorMsg } from "@/components/ui";
import { generarPassword } from "@/lib/generar-password";
import { MIN_PASSWORD, ROLES, ROL_LABEL, type Rol } from "@/lib/usuarios";
import {
  cambiarActivo,
  cambiarPassword,
  crearUsuario,
  editarUsuario,
  type CrearUsuarioState,
  type EditarUsuarioState,
  type SimpleState,
} from "./actions";

export type UsuarioFila = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  escuelas: number;
};

const ROL_CLASES: Record<Rol, string> = {
  admin: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  supervisor: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  inspector: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
};

type Filtro = Rol | "todos";

export function UsuariosAdmin({ usuarios, miId }: { usuarios: UsuarioFila[]; miId: string }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const conteo = useMemo(() => {
    const c: Record<Filtro, number> = { todos: usuarios.length, admin: 0, supervisor: 0, inspector: 0 };
    for (const u of usuarios) c[u.rol]++;
    return c;
  }, [usuarios]);

  const visibles = filtro === "todos" ? usuarios : usuarios.filter((u) => u.rol === filtro);

  return (
    <>
      <NuevoUsuario />

      <section className="flex flex-col gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(["todos", ...ROLES] as Filtro[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors ${
                filtro === f ? "bg-foreground text-background ring-foreground" : "bg-surface ring-border"
              }`}
            >
              {f === "todos" ? "Todos" : `${ROL_LABEL[f]}${f === "admin" ? "" : "es"}`} ({conteo[f]})
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No hay usuarios con ese rol.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {visibles.map((u) => (
              <Fila key={u.id} usuario={u} esYo={u.id === miId} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------

const crearInicial: CrearUsuarioState = {
  error: null,
  valores: { nombre: "", apellido: "", email: "", rol: "" },
  creado: null,
  intento: 0,
};

function NuevoUsuario() {
  const [abierto, setAbierto] = useState(false);
  const [state, action, pending] = useActionState(crearUsuario, crearInicial);
  const [password, setPassword] = useState("");
  const [creadoVisto, setCreadoVisto] = useState<CrearUsuarioState["creado"]>(null);

  // Mostrar la tarjeta de credenciales del ultimo usuario creado hasta que el admin la cierre
  const creado = state.creado && state.creado !== creadoVisto ? state.creado : null;

  if (creado) {
    return (
      <Credenciales
        {...creado}
        onCerrar={() => {
          setCreadoVisto(state.creado);
          setPassword("");
          setAbierto(false);
        }}
      />
    );
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="btn-primary">
        + Nuevo usuario
      </button>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Nuevo usuario</h2>
        <button type="button" onClick={() => setAbierto(false)} className="text-sm font-medium text-muted">
          Cancelar
        </button>
      </div>

      <div key={state.intento} className="grid gap-3 sm:grid-cols-2">
        <input name="nombre" defaultValue={state.valores.nombre} placeholder="Nombre" aria-label="Nombre" autoComplete="off" className="input" />
        <input name="apellido" defaultValue={state.valores.apellido} placeholder="Apellido" aria-label="Apellido" autoComplete="off" className="input" />
        <input name="email" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" defaultValue={state.valores.email} placeholder="Email" aria-label="Email" className="input" />
        <select name="rol" defaultValue={state.valores.rol} aria-label="Rol" className="input">
          <option value="" disabled>
            Rol…
          </option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROL_LABEL[r]}
            </option>
          ))}
        </select>
      </div>

      <PasswordInput value={password} onChange={setPassword} />

      {state.error && <ErrorMsg mensaje={state.error} />}

      <button type="submit" disabled={pending} className="btn-primary sm:w-auto sm:self-end sm:px-8">
        {pending ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}

function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="password"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Contraseña (mín. ${MIN_PASSWORD})`}
          aria-label="Contraseña"
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          className="input font-mono"
        />
        <button type="button" onClick={() => onChange(generarPassword())} className="btn-secondary h-12 shrink-0">
          Generar
        </button>
      </div>
      <p className="text-xs text-muted">
        Pasásela al usuario por un medio privado. Después se puede cambiar desde acá.
      </p>
    </div>
  );
}

function Credenciales({
  nombre,
  email,
  password,
  onCerrar,
}: {
  nombre: string;
  email: string;
  password: string;
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const texto = `Usuario: ${email}\nContraseña: ${password}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      // Sin clipboard (http en red local): que lo copie a mano
    }
  };

  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/30">
      <p className="font-semibold text-emerald-800 dark:text-emerald-300">Usuario creado: {nombre}</p>
      <p className="text-sm">Pasale estos datos para que pueda ingresar:</p>
      <pre className="select-all overflow-x-auto rounded-xl bg-surface p-3 font-mono text-sm ring-1 ring-border">{texto}</pre>
      <div className="flex gap-2">
        <button type="button" onClick={copiar} className="btn-secondary h-11 flex-1">
          {copiado ? "¡Copiado!" : "Copiar"}
        </button>
        <button type="button" onClick={onCerrar} className="btn-primary h-11 flex-1">
          Listo
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const simpleInicial: SimpleState = { error: null, ok: false };

function Fila({ usuario: u, esYo }: { usuario: UsuarioFila; esYo: boolean }) {
  const [modo, setModo] = useState<"ver" | "editar" | "password">("ver");
  const [errorActivo, setErrorActivo] = useState<string | null>(null);
  const [cambiando, startTransition] = useTransition();

  const [password, setPassword] = useState("");
  const [passState, passAction, guardandoPass] = useActionState(
    async (prev: SimpleState, fd: FormData) => cambiarPassword(u.id, prev, fd),
    simpleInicial,
  );

  const toggleActivo = () =>
    startTransition(async () => {
      const r = await cambiarActivo(u.id, !u.activo);
      setErrorActivo(r.error);
    });

  if (modo === "editar") {
    return <EditarUsuario usuario={u} esYo={esYo} onCerrar={() => setModo("ver")} />;
  }

  if (modo === "password") {
    return (
      <li className="p-4">
        <form action={passAction} className="flex flex-col gap-3">
          <p className="text-sm">
            Nueva contraseña para <strong>{u.nombre} {u.apellido}</strong>
          </p>
          <PasswordInput value={password} onChange={setPassword} />
          {passState.error && <ErrorMsg mensaje={passState.error} />}
          {passState.ok ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                Contraseña cambiada. Pasale la nueva: <span className="select-all font-mono font-semibold">{password}</span>
              </p>
              <button type="button" onClick={() => { setModo("ver"); setPassword(""); }} className="btn-secondary h-11">
                Listo
              </button>
            </div>
          ) : (
            <Botones onCancelar={() => setModo("ver")} pending={guardandoPass} />
          )}
        </form>
      </li>
    );
  }

  return (
    <li className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${u.activo ? "" : "bg-background/60"}`}>
      <div className={`min-w-0 flex-1 ${u.activo ? "" : "opacity-60"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {u.nombre} {u.apellido}
          </span>
          {esYo && <span className="text-xs text-muted">(vos)</span>}
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROL_CLASES[u.rol]}`}>
            {ROL_LABEL[u.rol]}
          </span>
          {!u.activo && (
            <span className="rounded-full px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-border">
              Desactivado
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted">
          {u.email}
          {u.rol !== "admin" && ` · ${u.escuelas} escuela${u.escuelas === 1 ? "" : "s"}`}
        </p>
        {errorActivo && <p className="mt-2 text-sm text-danger">{errorActivo}</p>}
      </div>
      <div className="-ml-3 flex shrink-0 flex-wrap sm:ml-0">
        <Accion onClick={() => setModo("editar")} principal>
          Editar
        </Accion>
        <Accion onClick={() => { setPassword(""); setModo("password"); }}>Contraseña</Accion>
        {!esYo && (
          <Accion onClick={toggleActivo} disabled={cambiando}>
            {cambiando ? "…" : u.activo ? "Desactivar" : "Activar"}
          </Accion>
        )}
      </div>
    </li>
  );
}

// Componente aparte: cada vez que se abre arranca con los datos actuales del usuario
function EditarUsuario({
  usuario: u,
  esYo,
  onCerrar,
}: {
  usuario: UsuarioFila;
  esYo: boolean;
  onCerrar: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: EditarUsuarioState, fd: FormData) => {
      const r = await editarUsuario(u.id, prev, fd);
      if (r.ok) onCerrar();
      return r;
    },
    {
      error: null,
      ok: false,
      valores: { nombre: u.nombre, apellido: u.apellido, email: u.email, rol: u.rol },
      intento: 0,
    },
  );
  const v = state.valores;

  return (
    <li className="p-4">
      <form action={action} noValidate className="flex flex-col gap-3">
        <div key={state.intento} className="grid gap-3 sm:grid-cols-2">
          <input name="nombre" defaultValue={v.nombre} placeholder="Nombre" aria-label="Nombre" autoFocus className="input" />
          <input name="apellido" defaultValue={v.apellido} placeholder="Apellido" aria-label="Apellido" className="input" />
          <input
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            defaultValue={v.email}
            placeholder="Email"
            aria-label="Email"
            className="input"
          />
          <select name="rol" defaultValue={v.rol} aria-label="Rol" disabled={esYo} className="input disabled:opacity-60">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROL_LABEL[r]}
              </option>
            ))}
          </select>
          {/* select deshabilitado no se envia: mandar el rol actual */}
          {esYo && <input type="hidden" name="rol" value={u.rol} />}
        </div>
        <p className="text-xs text-muted">
          Si cambiás el email, el usuario pasa a ingresar con el nuevo. La contraseña no cambia.
        </p>
        {state.error && <ErrorMsg mensaje={state.error} />}
        <Botones onCancelar={onCerrar} pending={pending} />
      </form>
    </li>
  );
}

function Accion({
  children,
  onClick,
  principal,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  principal?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-2 text-sm font-medium hover:bg-background ${principal ? "text-primary" : "text-muted"}`}
    >
      {children}
    </button>
  );
}

function Botones({ onCancelar, pending }: { onCancelar: () => void; pending: boolean }) {
  return (
    <div className="flex gap-2 sm:justify-end">
      <button type="button" onClick={onCancelar} className="btn-secondary h-11 flex-1 sm:flex-none">
        Cancelar
      </button>
      <button type="submit" disabled={pending} className="btn-primary h-11 flex-1 sm:w-auto sm:flex-none sm:px-6">
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
