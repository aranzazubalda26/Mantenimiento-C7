import { fechaLarga } from "@/lib/fechas";
import { MenuUsuario } from "./shell";

// Encabezado fijo de cada pantalla: titulo grande, fecha (o subtitulo) abajo,
// acciones y el avatar con el menu de la cuenta a la derecha.
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
    <header className="sticky top-0 z-20 bg-[rgba(245,246,248,0.85)] pt-[env(safe-area-inset-top)] backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 pb-3 pt-3 pc:mx-0 pc:max-w-none pc:px-8 pc:pt-5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl leading-tight font-bold tracking-[-0.02em] pc:text-2xl">{titulo}</h1>
          <p className="truncate text-[13px] text-muted">{subtitulo ?? fechaLarga()}</p>
        </div>
        {children}
        <MenuUsuario />
      </div>
    </header>
  );
}

// Contenedor del contenido de cada pantalla. En el celular deja lugar abajo para la barra de navegacion.
export function Pagina({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <main
      className={`mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-1 pc:mx-0 pc:max-w-none pc:gap-5 pc:px-8 pc:pb-10 pc:pt-2 ${className}`}
    >
      {children}
    </main>
  );
}
