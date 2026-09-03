export function clinicPublicPath(slug: string): string {
  return `/clinics/${slug}/`;
}

export function clinicDoctorPublicPath(clinicSlug: string, doctorSlug: string): string {
  return `/clinics/${clinicSlug}/${doctorSlug}/`;
}

export function organizationKindLabel(kind: string): string {
  if (kind === "hospital") return "Hospital";
  if (kind === "solo_practice") return "Practice";
  return "Clinic";
}
