import { fechaLarga } from "@/lib/fechas";
import { BotonMenu } from "./shell";

// Encabezado fijo de cada pantalla: titulo grande, fecha (o subtitulo) abajo
// y acciones a la derecha. En el celular muestra el boton del menu.
export function AppHeader({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3.5 bg-[rgba(245,246,248,0.85)] px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-md backdrop-saturate-150 pc:px-8 pc:pb-3.5 pc:pt-[calc(18px+env(safe-area-inset-top))]">
      <BotonMenu />
      <div className="min-w-0">
        <h1 className="truncate text-xl leading-tight font-bold tracking-[-0.02em] pc:text-2xl">
          {titulo}
        </h1>
        <p className="hidden truncate text-[13px] text-muted pc:block">
          {subtitulo ?? fechaLarga()}
        </p>
      </div>
      {children && <div className="ml-auto flex items-center gap-2.5">{children}</div>}
    </header>
  );
}

// Contenedor del contenido de cada pantalla (margenes del diseño)
export function Pagina({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={`flex flex-col gap-4 px-4 pb-8 pt-1 pc:gap-5 pc:px-8 pc:pb-10 pc:pt-2 ${className}`}>
      {children}
    </main>
  );
}
