import { Shell } from "@/components/shell";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Layout de todas las pantallas con sesion (el login queda afuera del grupo)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { id, nombre, apellido, email, rol } = await getUsuario();

  // Contadores del menu: ordenes pendientes que el usuario puede ver (RLS) y avisos sin leer
  const supabase = await createClient();
  const [{ count }, { count: avisos }] = await Promise.all([
    supabase.from("ordenes_trabajo").select("*", { count: "exact", head: true }).eq("estado", "solicitada"),
    // Avisos: solo supervisor/a e inspector/a tienen campanita
    rol === "supervisor" || rol === "inspector"
      ? supabase.from("avisos").select("*", { count: "exact", head: true }).is("leido_at", null)
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <Shell usuario={{ id, nombre, apellido, email, rol }} pendientes={count ?? 0} avisos={avisos ?? 0}>
      {children}
    </Shell>
  );
}
