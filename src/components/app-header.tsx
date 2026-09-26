import Link from "next/link";
import { BotonMenu } from "./shell";

// Barra superior fija. Con `volverA` muestra la flecha para volver;
// si no, en el celular muestra el boton del menu.
export function AppHeader({
  titulo,
  volverA,
  children,
}: {
  titulo: string;
  volverA?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-4">
        {volverA ? (
          <Link
            href={volverA}
            aria-label="Volver"
            className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-surface"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        ) : (
          <BotonMenu />
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
          {titulo}
        </h1>
        {children}
      </div>
    </header>
  );
}
