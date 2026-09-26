import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas accesibles sin sesion
const RUTAS_PUBLICAS = ["/login"];

// Refresca el token de sesion en cada request y lo pasa al navegador.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // Evita que un CDN cachee la respuesta con la sesion de otro usuario
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // No poner codigo entre createServerClient y getClaims().
  const { data } = await supabase.auth.getClaims();
  const logueado = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.some((r) => pathname.startsWith(r));

  if (!logueado && !esPublica) return redirigir(request, "/login", supabaseResponse);
  if (logueado && pathname === "/login") return redirigir(request, "/", supabaseResponse);

  // Devolver siempre supabaseResponse: lleva las cookies refrescadas.
  return supabaseResponse;
}

// Redirige conservando las cookies y headers de sesion ya refrescados
function redirigir(request: NextRequest, destino: string, base: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = "";
  const response = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = base.headers.get(header);
    if (value) response.headers.set(header, value);
  }
  return response;
}
