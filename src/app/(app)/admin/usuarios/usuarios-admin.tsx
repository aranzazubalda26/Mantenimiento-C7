"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { IconoMas, IconoOk } from "@/components/iconos";
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
  admin: "bg-[#ede7fe] text-[#5b21b6]",
  supervisor: "bg-[#dce8fd] text-[#1e40af]",
  inspector: "bg-primary-soft text-primary",
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
        <div className="segmento w-max" role="group" aria-label="Filtrar por rol">
          {(["todos", ...ROLES] as Filtro[]).map((f) => (
            <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f}>
              {f === "todos" ? "Todos" : `${ROL_LABEL[f]}${f === "admin" ? "" : "es"}`}
              <span className="text-xs font-normal text-muted">{conteo[f]}</span>
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <p className="tarjeta px-5 py-12 text-center text-muted">
            No hay usuarios con ese rol.
          </p>
        ) : (
          <ul className="tarjeta divide-y divide-border overflow-hidden">
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
      <button type="button" onClick={() => setAbierto(true)} className="btn-primary self-start">
        <IconoMas className="size-[18px]" />
        Nuevo usuario
      </button>
    );
  }

  return (
    <form action={action} noValidate className="tarjeta flex flex-col gap-4 p-[18px] pc:p-[22px]">
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
        <button type="button" onClick={() => onChange(generarPassword())} className="btn-secondary min-h-[46px] shrink-0">
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
    <div role="status" className="tarjeta flex flex-col gap-3 border-primary/30 bg-primary-soft p-[18px]">
      <p className="flex items-center gap-2 font-semibold text-primary"><IconoOk className="size-[18px]" />Usuario creado: {nombre}</p>
      <p className="text-sm">Pasale estos datos para que pueda ingresar:</p>
      <pre className="num select-all overflow-x-auto rounded-[10px] border border-border bg-surface p-3 text-sm">{texto}</pre>
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
      <li className="bg-fila-hover p-4 pc:px-5">
        <form action={passAction} className="flex flex-col gap-3">
          <p className="text-sm">
            Nueva contraseña para <strong>{u.nombre} {u.apellido}</strong>
          </p>
          <PasswordInput value={password} onChange={setPassword} />
          {passState.error && <ErrorMsg mensaje={passState.error} />}
          {passState.ok ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="rounded-[10px] bg-primary-soft px-3.5 py-3 text-sm font-medium text-primary">
                Contraseña cambiada. Pasale la nueva: <span className="num select-all font-semibold">{password}</span>
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
    <li className="flex flex-col gap-3 px-4 py-3.5 hover:bg-fila-hover sm:flex-row sm:flex-wrap sm:items-center pc:px-5">
      <div className={`flex min-w-0 flex-1 items-center gap-3 ${u.activo ? "" : "opacity-60"}`}>
        <span className="avatar">{`${u.nombre[0] ?? ""}${u.apellido[0] ?? ""}`.toUpperCase()}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {u.nombre} {u.apellido}
            </span>
            {esYo && <span className="text-xs text-muted">(vos)</span>}
            <span className={`inline-flex h-[22px] items-center rounded-full px-2 text-xs font-semibold ${ROL_CLASES[u.rol]}`}>
              {ROL_LABEL[u.rol]}
            </span>
            {!u.activo && (
              <span className="inline-flex h-[22px] items-center rounded-full bg-[#eef0f3] px-2 text-xs font-semibold text-[#475467]">
                Desactivado
              </span>
            )}
          </div>
          <p className="truncate text-[13px] text-muted">
            {u.email}
            {u.rol !== "admin" && ` · ${u.escuelas} escuela${u.escuelas === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>
      {errorActivo && <p className="text-sm font-medium text-danger sm:order-last sm:basis-full">{errorActivo}</p>}
      <div className="flex shrink-0 gap-1.5 *:flex-1 sm:*:flex-none">
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
    <li className="bg-fila-hover p-4 pc:px-5">
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
      className={`btn-secondary btn-chico ${principal ? "" : "text-muted"}`}
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
