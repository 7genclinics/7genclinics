const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function slugifyDoctorName(fullName: string): string {
  const stripped = fullName
    .trim()
    .toLowerCase()
    .replace(/^dr\.?\s+/, "");
  const slug = stripped
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `dr-${slug || "doctor"}`;
}

export function createId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function doctorPublicPath(slug: string): string {
  return `/doctors/${slug}`;
}

export function absoluteDoctorUrl(slug: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "") ??
    "";
  return `${base}${doctorPublicPath(slug)}`;
}
