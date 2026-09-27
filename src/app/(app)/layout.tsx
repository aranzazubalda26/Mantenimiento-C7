import { Shell } from "@/components/shell";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Layout de todas las pantallas con sesion (el login queda afuera del grupo)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { nombre, apellido, email, rol } = await getUsuario();

  // Contador del menu: ordenes sin terminar que el usuario puede ver (RLS)
  const supabase = await createClient();
  const { count } = await supabase
    .from("ordenes_trabajo")
    .select("*", { count: "exact", head: true })
    .neq("estado", "cerrada");

  return (
    <Shell usuario={{ nombre, apellido, email, rol }} pendientes={count ?? 0}>
      {children}
    </Shell>
  );
}
