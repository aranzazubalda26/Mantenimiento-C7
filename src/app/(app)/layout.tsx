import { Shell } from "@/components/shell";
import { getUsuario } from "@/lib/auth";

// Layout de todas las pantallas con sesion (el login queda afuera del grupo)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { nombre, apellido, email, rol } = await getUsuario();
  return <Shell usuario={{ nombre, apellido, email, rol }}>{children}</Shell>;
}
