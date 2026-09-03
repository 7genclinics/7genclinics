import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { canonicalRedirect } from "@/lib/seo/canonical-redirect";

export async function middleware(request: NextRequest) {
  const canonical = canonicalRedirect(request);
  if (canonical) return canonical;
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
