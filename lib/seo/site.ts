/** Production origin — always HTTPS, never www. */
export const SITE_HOST = "apnaclinic.pk";
export const SITE_ORIGIN = `https://${SITE_HOST}`;
export const SITE_URL = `${SITE_ORIGIN}/`;

const FILE_EXT_RE = /\.[a-z0-9]+$/i;

export function withTrailingSlash(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const [path, hash] = pathname.split("#");
  const [clean, query] = path.split("?");
  if (clean === "/") {
    return query ? `/?${query}` : "/";
  }
  const slashed = clean.endsWith("/") ? clean : `${clean}/`;
  const withQuery = query ? `${slashed}?${query}` : slashed;
  return hash ? `${withQuery}#${hash}` : withQuery;
}

export function normalizePathname(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withTrailingSlash(path.split("?")[0].split("#")[0]);
}

/** Absolute canonical URL. Query strings are omitted to prevent duplicate indexes. */
export function canonicalUrl(pathname = "/"): string {
  const path = normalizePathname(pathname);
  if (path === "/") return SITE_URL;
  return `${SITE_ORIGIN}${path}`;
}

export function shouldSkipTrailingSlash(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/sw.js") return true;
  const last = pathname.split("/").pop() ?? "";
  return FILE_EXT_RE.test(last);
}

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function breadcrumbListJsonLd(items: BreadcrumbItem[]) {
  const list = [{ name: "Home", path: "/" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: list.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "@id": `${SITE_URL}#clinic`,
    name: "Apna Clinic",
    url: SITE_URL,
    email: "support@apnaclinic.pk",
    telephone: "+92 300 1234567",
    address: {
      "@type": "PostalAddress",
      addressCountry: "PK",
      addressLocality: "Lahore",
    },
    areaServed: "PK",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    name: "Apna Clinic",
    url: SITE_URL,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}#clinic` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${canonicalUrl("/doctors/")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
