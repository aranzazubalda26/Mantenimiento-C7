"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { ROL_LABEL, type Rol } from "@/lib/usuarios";

type UsuarioShell = { nombre: string; apellido: string; email: string; rol: Rol | null };

type Item = { href: string; label: string; icono: React.ReactNode; roles: Rol[] };
type Seccion = { titulo?: string; items: Item[] };

// Menu segun rol. Para sumar una pantalla nueva, agregarla aca.
const SECCIONES: Seccion[] = [
  {
    items: [
      { href: "/", label: "Inicio", icono: <IconoInicio />, roles: ["admin", "supervisor", "inspector"] },
      { href: "/ordenes/nueva", label: "Nueva orden", icono: <IconoMas />, roles: ["admin", "inspector"] },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { href: "/admin/escuelas", label: "Escuelas", icono: <IconoEscuela />, roles: ["admin"] },
      { href: "/admin/usuarios", label: "Usuarios", icono: <IconoUsuarios />, roles: ["admin"] },
    ],
  },
];

const MenuContext = createContext<{ abrir: () => void }>({ abrir: () => {} });

// Estructura de las pantallas con sesion: barra lateral fija en PC,
// panel deslizable en el celular (se abre con el boton del encabezado).
export function Shell({ usuario, children }: { usuario: UsuarioShell; children: React.ReactNode }) {
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
      <div className="flex min-h-dvh">
        {/* PC */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-surface lg:block">
          <Sidebar usuario={usuario} />
        </aside>

        {/* Celular */}
        <div
          onClick={() => setAbierto(false)}
          aria-hidden
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
            abierto ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
          inert={!abierto}
          className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-surface shadow-xl transition-transform duration-200 lg:hidden ${
            abierto ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar usuario={usuario} onNavegar={() => setAbierto(false)} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
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
      className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-surface lg:hidden"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-6" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

function Sidebar({ usuario, onNavegar }: { usuario: UsuarioShell; onNavegar?: () => void }) {
  const pathname = usePathname();
  const rol = usuario.rol;
  const iniciales = `${usuario.nombre[0] ?? ""}${usuario.apellido[0] ?? ""}`.toUpperCase() || "?";

  const secciones = SECCIONES.map((s) => ({
    ...s,
    items: s.items.filter((i) => rol && i.roles.includes(rol)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-14 items-center gap-3 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </span>
        <span className="font-semibold tracking-tight">Mantenimiento C7</span>
      </div>

      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 py-2">
        {secciones.map((s, i) => (
          <div key={i} className={i > 0 ? "mt-6" : ""}>
            {s.titulo && (
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted">{s.titulo}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {s.items.map((item) => {
                const activo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavegar}
                      aria-current={activo ? "page" : undefined}
                      className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors ${
                        activo ? "bg-primary/10 text-primary" : "hover:bg-background"
                      }`}
                    >
                      <span className="size-5 shrink-0">{item.icono}</span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
            {iniciales}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {usuario.nombre ? `${usuario.nombre} ${usuario.apellido}` : usuario.email}
            </p>
            <p className="truncate text-xs text-muted">{rol ? ROL_LABEL[rol] : "Sin acceso"}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="mt-1 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
          >
            <span className="size-5 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </span>
            Salir
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Iconos (trazo de 24px, heredan el color del texto)

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      {children}
    </svg>
  );
}

function IconoInicio() {
  return (
    <Svg>
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

function IconoMas() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </Svg>
  );
}

function IconoEscuela() {
  return (
    <Svg>
      <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5M12 11h.01" />
    </Svg>
  );
}

function IconoUsuarios() {
  return (
    <Svg>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" />
    </Svg>
  );
}
