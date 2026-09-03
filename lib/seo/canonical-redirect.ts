import { NextResponse, type NextRequest } from "next/server";
import { SITE_HOST, shouldSkipTrailingSlash, withTrailingSlash } from "@/lib/seo/site";

/** 301 www → non-www and missing trailing slash → slash. Localhost only gets slash fix. */
export function canonicalRedirect(request: NextRequest): NextResponse | null {
  const url = request.nextUrl.clone();
  const hostHeader = request.headers.get("host") ?? url.host;
  const hostname = hostHeader.split(":")[0].toLowerCase();
  const pathname = url.pathname;

  const isWww = hostname === `www.${SITE_HOST}`;
  const needsSlash =
    !shouldSkipTrailingSlash(pathname) && pathname !== "/" && !pathname.endsWith("/");

  if (!isWww && !needsSlash) return null;

  if (needsSlash) {
    url.pathname = withTrailingSlash(pathname);
  }

  if (isWww) {
    const dest = new URL(`https://${SITE_HOST}${url.pathname}${url.search}`);
    return NextResponse.redirect(dest, 301);
  }

  return NextResponse.redirect(url, 301);
}
