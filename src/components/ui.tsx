import { IconoLupa } from "./iconos";

// Buscador con lupa (como en la lista de tareas del diseño)
export function Buscador({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex min-h-11 max-w-[380px] flex-[1_1_260px] items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 shadow-suave focus-within:border-primary">
      <IconoLupa className="size-[18px] text-muted" />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 grow bg-transparent text-base outline-none"
      />
    </label>
  );
}

export function ErrorMsg({ mensaje }: { mensaje: string }) {
  return (
    <p role="alert" className="rounded-[10px] bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger">
      {mensaje}
    </p>
  );
}

export function Campo({
  label,
  htmlFor,
  opcional,
  children,
}: {
  label: string;
  htmlFor: string;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {opcional && <span className="font-normal text-muted"> (opcional)</span>}
      </label>
      {children}
    </div>
  );
}

// Bloque de formulario (tarjeta con aire interno)
export function Bloque({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`tarjeta flex flex-col gap-[18px] p-[18px] pc:p-[22px] ${className}`}>{children}</div>;
}

// Botonera final de un formulario: en el celular queda pegada abajo
export function PieForm({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 flex justify-end gap-2.5 bg-gradient-to-b from-transparent to-background to-30% py-3 pb-[calc(12px+env(safe-area-inset-bottom))] *:flex-1 pc:static pc:bg-none pc:p-0 pc:*:flex-none">
      {children}
    </div>
  );
}
