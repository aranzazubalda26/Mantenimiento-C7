"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { ROL_LABEL, type Rol } from "@/lib/usuarios";
import {
  IconoEscuela,
  IconoGente,
  IconoInicio,
  IconoLlave,
  IconoMas,
  IconoMenu,
  IconoSalir,
  IconoX,
} from "./iconos";

type UsuarioShell = { nombre: string; apellido: string; email: string; rol: Rol | null };

type Item = {
  href: string;
  label: string;
  icono: React.ReactNode;
  roles: Rol[];
  contador?: "abiertas";
};
type Seccion = { titulo: string; items: Item[] };

// Menu segun rol. Para sumar una pantalla nueva, agregarla aca.
const SECCIONES: Seccion[] = [
  {
    titulo: "Órdenes",
    items: [
      { href: "/", label: "Inicio", icono: <IconoInicio />, roles: ["admin", "supervisor", "inspector"], contador: "abiertas" },
      { href: "/ordenes/nueva", label: "Nueva orden", icono: <IconoMas />, roles: ["admin", "inspector"] },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { href: "/admin/escuelas", label: "Escuelas", icono: <IconoEscuela />, roles: ["admin"] },
      { href: "/admin/usuarios", label: "Usuarios", icono: <IconoGente />, roles: ["admin"] },
    ],
  },
];

const MenuContext = createContext<{ abrir: () => void }>({ abrir: () => {} });

// Estructura de las pantallas con sesion: barra lateral fija en PC,
// panel deslizable en el celular (se abre con el boton del encabezado).
export function Shell({
  usuario,
  abiertas,
  children,
}: {
  usuario: UsuarioShell;
  abiertas: number; // ordenes sin finalizar que ve el usuario
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", esc);
    // Que no se desplace la pagina de atras mientras el menu esta abierto
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <MenuContext.Provider value={{ abrir: () => setAbierto(true) }}>
      <div className="min-h-dvh pc:grid pc:grid-cols-[264px_minmax(0,1fr)]">
        {/* PC */}
        <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-border bg-surface pc:block">
          <Lateral usuario={usuario} abiertas={abiertas} />
        </aside>

        {/* Celular */}
        <div
          onClick={() => setAbierto(false)}
          aria-hidden
          className={`fixed inset-0 z-40 bg-[rgba(16,24,40,0.4)] transition-opacity pc:hidden ${
            abierto ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
          inert={!abierto}
          className={`fixed inset-y-0 left-0 z-50 w-[min(300px,86vw)] overflow-y-auto bg-surface shadow-alta transition-transform duration-250 ease-out pc:hidden ${
            abierto ? "translate-x-0" : "-translate-x-[105%]"
          }`}
        >
          <Lateral usuario={usuario} abiertas={abiertas} onCerrar={() => setAbierto(false)} />
        </aside>

        <div className="flex min-w-0 flex-col">{children}</div>
      </div>
    </MenuContext.Provider>
  );
}

// Boton ☰ del encabezado (solo en celular)
export function BotonMenu() {
  const { abrir } = useContext(MenuContext);
  return (
    <button
      type="button"
      onClick={abrir}
      aria-label="Abrir menú"
      className="grid size-11 shrink-0 place-items-center rounded-[10px] border border-border bg-surface pc:hidden"
    >
      <IconoMenu />
    </button>
  );
}

function Lateral({
  usuario,
  abiertas,
  onCerrar,
}: {
  usuario: UsuarioShell;
  abiertas: number;
  onCerrar?: () => void;
}) {
  const pathname = usePathname();
  const rol = usuario.rol;
  const iniciales = `${usuario.nombre[0] ?? ""}${usuario.apellido[0] ?? ""}`.toUpperCase() || "?";

  const secciones = SECCIONES.map((s) => ({
    ...s,
    items: s.items.filter((i) => rol && i.roles.includes(rol)),
  })).filter((s) => s.items.length > 0);

  return (
    <nav
      aria-label="Menú principal"
      className="flex min-h-full flex-col gap-6 px-3.5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))] pc:pt-5"
    >
      <div className="flex items-center gap-2.5 px-2 text-[17px] font-bold tracking-[-0.01em]">
        <span className="grid size-8 place-items-center rounded-[9px] bg-primary text-white">
          <IconoLlave className="size-[18px]" />
        </span>
        Mantenimiento C7
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="ml-auto grid size-10 place-items-center rounded-[10px] text-muted"
          >
            <IconoX />
          </button>
        )}
      </div>

      {secciones.map((s) => (
        <div key={s.titulo}>
          <p className="px-2.5 pb-1.5 text-xs font-semibold text-muted">{s.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {s.items.map((item) => {
              const activo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const contador = item.contador === "abiertas" ? abiertas : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onCerrar}
                    aria-current={activo ? "page" : undefined}
                    className={`flex min-h-[42px] items-center gap-3 rounded-lg px-2.5 font-medium transition-colors ${
                      activo
                        ? "bg-primary-soft font-semibold text-primary"
                        : "text-muted hover:bg-background hover:text-foreground"
                    }`}
                  >
                    {item.icono}
                    {item.label}
                    {contador > 0 && (
                      <span
                        title="Órdenes sin cerrar"
                        className={`ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full px-[7px] text-xs font-semibold ${
                          activo ? "bg-white text-primary" : "bg-background text-muted"
                        }`}
                      >
                        {contador}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex items-center gap-3 rounded-xl border border-border p-2.5">
          <span className="avatar">{iniciales}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {usuario.nombre ? `${usuario.nombre} ${usuario.apellido}` : usuario.email}
            </p>
            <p className="truncate text-[13px] text-muted">{rol ? ROL_LABEL[rol] : "Sin acceso"}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-[13px] font-medium text-muted hover:border-muted hover:text-foreground"
          >
            <IconoSalir className="size-4" />
            Salir
          </button>
        </form>
      </div>
    </nav>
  );
}
