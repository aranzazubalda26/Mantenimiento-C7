export function ErrorMsg({ mensaje }: { mensaje: string }) {
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
      {mensaje}
    </p>
  );
}

export function Campo({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
