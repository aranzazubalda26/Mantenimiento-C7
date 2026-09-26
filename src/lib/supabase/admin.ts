import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con service_role: SALTA RLS. Solo para tareas de servidor
// (scripts, acciones de administrador). Nunca importarlo desde un Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
