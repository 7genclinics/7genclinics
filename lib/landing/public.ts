import { createClient } from "@/lib/supabase/server";
import { attachTaxonomyToDoctor } from "@/lib/doctor/taxonomy";
import { parseLandingContent } from "./content";
import { DEFAULT_CLINIC, emptyLandingContent } from "./defaults";
import { presentServices } from "./display";
import { isUuid } from "./slug";
import type {
  LandingClinicDefaults,
  LandingContent,
  LandingPageStatus,
  PublicAvailabilitySlot,
  PublicLandingDoctor,
  PublicLandingPageData,
  PublicLandingReview,
  PublicLandingService,
} from "./types";
import type { AppointmentType, Gender } from "@/types";

type LandingRow = {
  id: string;
  doctor_id: string;
  slug: string;
  status: LandingPageStatus;
  draft_content: unknown;
  published_content: unknown;
  is_featured: boolean;
};

const DOCTOR_PUBLIC_SELECT = `
  id, user_id, specialization, sub_specialization, qualification, experience_years,
  pmdc_number, bio, consultation_fee, follow_up_fee, rating, total_reviews, total_consultations,
  is_available, cities, languages, hospital_affiliations,
  profile:profiles!doctor_profiles_user_id_fkey ( full_name, avatar_url, city, gender ),
  doctor_taxonomy ( taxonomy_items ( id, label, kind ) )
`;

function mapDoctor(row: Record<string, unknown>): PublicLandingDoctor {
  const withTaxonomy = attachTaxonomyToDoctor(row);
  const profile = (withTaxonomy.profile ?? null) as {
    full_name?: string | null;
    avatar_url?: string | null;
    city?: string | null;
    gender?: Gender | null;
  } | null;

  return {
    id: String(withTaxonomy.id),
    slug: "",
    fullName: profile?.full_name ?? "Doctor",
    avatarUrl: profile?.avatar_url ?? null,
    specialization: String(withTaxonomy.specialization ?? ""),
    subSpecialization: (withTaxonomy.sub_specialization as string | null) ?? null,
    qualification: Array.isArray(withTaxonomy.qualification)
      ? (withTaxonomy.qualification as string[])
      : [],
    experienceYears: Number(withTaxonomy.experience_years ?? 0),
    pmdcNumber: String(withTaxonomy.pmdc_number ?? ""),
    bio: (withTaxonomy.bio as string | null) ?? null,
    consultationFee: Number(withTaxonomy.consultation_fee ?? 0),
    followUpFee:
      withTaxonomy.follow_up_fee != null ? Number(withTaxonomy.follow_up_fee) : null,
    languages: Array.isArray(withTaxonomy.languages)
      ? (withTaxonomy.languages as string[])
      : ["Urdu", "English"],
    cities: Array.isArray(withTaxonomy.cities)
      ? (withTaxonomy.cities as string[])
      : profile?.city
        ? [profile.city]
        : [],
    hospitalAffiliations: Array.isArray(withTaxonomy.hospital_affiliations)
      ? (withTaxonomy.hospital_affiliations as string[])
      : [],
    rating: Number(withTaxonomy.rating ?? 0),
    totalReviews: Number(withTaxonomy.total_reviews ?? 0),
    totalConsultations: Number(withTaxonomy.total_consultations ?? 0),
    isAvailable: Boolean(withTaxonomy.is_available),
    taxonomyTags: withTaxonomy.taxonomy_tags ?? [],
    gender: profile?.gender ?? null,
  };
}

async function loadDoctor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorId: string,
): Promise<PublicLandingDoctor | null> {
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select(DOCTOR_PUBLIC_SELECT)
    .eq("id", doctorId)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) {
    const fallback = await supabase
      .from("doctor_profiles")
      .select(
        `id, user_id, specialization, sub_specialization, qualification, experience_years,
         pmdc_number, bio, consultation_fee, follow_up_fee, rating, total_reviews, total_consultations,
         is_available, cities, languages, hospital_affiliations,
         profile:profiles!doctor_profiles_user_id_fkey ( full_name, avatar_url, city, gender )`,
      )
      .eq("id", doctorId)
      .eq("status", "approved")
      .maybeSingle();
    if (fallback.error || !fallback.data) return null;
    return mapDoctor(fallback.data as Record<string, unknown>);
  }

  return mapDoctor(data as Record<string, unknown>);
}

async function canPreview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorUserId: string,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  if (user.id === doctorUserId) return true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  return role === "admin" || role === "super_admin";
}

function syntheticServices(
  doctor: PublicLandingDoctor,
  content: LandingContent,
  duration: number,
): PublicLandingService[] {
  const services: PublicLandingService[] = [];
  if (content.physicalEnabled) {
    services.push({
      id: "synthetic-physical",
      serviceId: null,
      name: "Physical Consultation",
      description: `In-person visit with ${doctor.fullName} at the clinic.`,
      fee: doctor.consultationFee,
      durationMinutes: duration,
      consultationTypes: ["in_person"],
      isSynthetic: true,
      imageUrl: null,
      benefits: [],
      featured: false,
    });
  }
  if (content.onlineEnabled) {
    services.push({
      id: "synthetic-online",
      serviceId: null,
      name: "Online Consultation",
      description: `Secure video consultation with ${doctor.fullName} from anywhere.`,
      fee: doctor.consultationFee,
      durationMinutes: duration,
      consultationTypes: ["video"],
      isSynthetic: true,
      imageUrl: null,
      benefits: [],
      featured: false,
    });
  }
  return services;
}

async function loadServices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctor: PublicLandingDoctor,
  content: LandingContent,
  duration: number,
): Promise<PublicLandingService[]> {
  const { data, error } = await supabase
    .from("doctor_public_services")
    .select(
      "id, service_id, is_visible, sort_order, consultation_types, fee_override, service:services ( id, name, description, default_fee, is_active )",
    )
    .eq("doctor_id", doctor.id)
    .eq("is_visible", true)
    .order("sort_order");

  if (error || !data?.length) {
    return presentServices(syntheticServices(doctor, content, duration), content.serviceCards);
  }

  const mapped = data
    .map((row) => {
      const service = Array.isArray(row.service) ? row.service[0] : row.service;
      if (!service || service.is_active === false) return null;
      const types = (row.consultation_types ?? []).filter(
        (type): type is AppointmentType =>
          type === "in_person" || type === "video" || type === "chat",
      );
      return {
        id: row.id,
        serviceId: row.service_id,
        name: service.name,
        description: service.description ?? "",
        fee: row.fee_override != null ? Number(row.fee_override) : Number(service.default_fee),
        durationMinutes: duration,
        consultationTypes: types.length ? types : (["in_person"] as AppointmentType[]),
        isSynthetic: false,
        imageUrl: null,
        benefits: [],
        featured: false,
      } satisfies PublicLandingService;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return mapped.length
    ? presentServices(mapped, content.serviceCards)
    : presentServices(syntheticServices(doctor, content, duration), content.serviceCards);
}

async function loadReviews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorId: string,
): Promise<PublicLandingReview[]> {
  const { data, error } = await supabase
    .from("doctor_public_reviews")
    .select("id, rating, comment, display_name, created_at")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error || !data) return [];
  return data
    .filter((row) => row.id && row.rating)
    .map((row) => ({
      id: row.id as string,
      rating: Number(row.rating),
      comment: row.comment,
      displayName: row.display_name || "Patient",
      createdAt: row.created_at ?? new Date().toISOString(),
    }));
}

async function loadAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorId: string,
): Promise<PublicAvailabilitySlot[]> {
  const { data, error } = await supabase
    .from("availability_slots")
    .select("day_of_week, start_time, end_time, slot_duration_minutes")
    .eq("doctor_id", doctorId)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  if (error) return [];
  return (data ?? []).map((slot) => ({
    day_of_week: slot.day_of_week,
    start_time: slot.start_time,
    end_time: slot.end_time,
    slot_duration_minutes: slot.slot_duration_minutes ?? 30,
  }));
}

export async function getLandingDefaultsServer(): Promise<LandingClinicDefaults> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "doctor_landing_defaults")
    .maybeSingle();

  const value = (data?.value ?? {}) as Partial<LandingClinicDefaults>;
  return {
    ...DEFAULT_CLINIC,
    ...value,
    accent: value.accent ?? DEFAULT_CLINIC.accent,
    buttonStyle: value.buttonStyle ?? DEFAULT_CLINIC.buttonStyle,
  };
}

export type PublicLandingLookup =
  | { kind: "ok"; data: PublicLandingPageData }
  | { kind: "redirect"; slug: string }
  | { kind: "not_found" };

export async function getPublicLandingPage(
  slugOrId: string,
  opts: { preview?: boolean } = {},
): Promise<PublicLandingLookup> {
  const supabase = await createClient();
  const defaults = DEFAULT_CLINIC;

  let landingQuery = supabase.from("doctor_landing_pages").select(
    "id, doctor_id, slug, status, draft_content, published_content, is_featured",
  );

  landingQuery = isUuid(slugOrId)
    ? landingQuery.eq("doctor_id", slugOrId)
    : landingQuery.eq("slug", slugOrId);

  const { data: landing, error } = await landingQuery.maybeSingle();
  if (error || !landing) return { kind: "not_found" };

  const row = landing as LandingRow;
  const doctor = await loadDoctor(supabase, row.doctor_id);
  if (!doctor) return { kind: "not_found" };
  doctor.slug = row.slug;

  if (isUuid(slugOrId) && row.slug && row.slug !== slugOrId) {
    if (row.status === "published" || opts.preview) {
      return { kind: "redirect", slug: row.slug };
    }
  }

  const wantsPreview = Boolean(opts.preview);
  let isPreview = false;
  let contentSource: unknown = row.published_content;

  if (wantsPreview) {
    const { data: doctorRow } = await supabase
      .from("doctor_profiles")
      .select("user_id")
      .eq("id", doctor.id)
      .maybeSingle();
    const allowed = await canPreview(supabase, doctorRow?.user_id ?? "");
    if (allowed) {
      isPreview = true;
      contentSource = row.draft_content ?? row.published_content;
    }
  }

  if (!isPreview && row.status !== "published") {
    return { kind: "not_found" };
  }

  const content = parseLandingContent(
    contentSource ?? emptyLandingContent(doctor, defaults),
    doctor,
    defaults,
  );

  const availability = await loadAvailability(supabase, doctor.id);
  const duration = availability[0]?.slot_duration_minutes ?? 30;
  const [services, reviews] = await Promise.all([
    loadServices(supabase, doctor, content, duration),
    loadReviews(supabase, doctor.id),
  ]);

  return {
    kind: "ok",
    data: {
      doctor,
      content,
      status: row.status,
      slug: row.slug,
      isPreview,
      services,
      reviews,
      availability,
    },
  };
}

export async function getPublishedLandingSlugs(): Promise<
  Array<{ doctorId: string; slug: string; status: LandingPageStatus }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_landing_pages")
    .select("doctor_id, slug, status")
    .eq("status", "published");
  if (error || !data) return [];
  return data.map((row) => ({
    doctorId: row.doctor_id,
    slug: row.slug,
    status: row.status,
  }));
}
