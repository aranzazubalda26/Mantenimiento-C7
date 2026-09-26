import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./login/actions";

// Pantalla de inicio provisoria: solo confirma que la sesion funciona.
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) redirect("/login");

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Mantenimiento C7
        </h1>
        <form action={logout}>
          <button type="submit" className="btn-secondary">
            Salir
          </button>
        </form>
      </header>

      <section className="mt-10">
        <p className="text-muted">Sesión iniciada como</p>
        <p className="mt-1 break-all text-lg font-medium">{claims.email}</p>
      </section>
    </main>
  );
}
