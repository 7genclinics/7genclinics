import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { parseLandingContent } from "./content";
import { DEFAULT_CLINIC } from "./defaults";
import type {
  AdminLandingPageRow,
  LandingClinicDefaults,
  LandingContent,
  LandingPageRecord,
  LandingPageStatus,
  ModeratedReview,
  ReviewModerationStatus,
} from "./types";

type TableName = keyof Database["public"]["Tables"];

function table(name: TableName) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient().from(name) as any;
}

export async function ensureDoctorLanding(doctorId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("ensure_doctor_landing_page", {
    p_doctor_id: doctorId,
  });
  if (error) throw error;
  return data as string;
}

export async function getDoctorLanding(doctorId: string): Promise<LandingPageRecord | null> {
  await ensureDoctorLanding(doctorId);
  const { data, error } = await table("doctor_landing_pages")
    .select("*")
    .eq("doctor_id", doctorId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapLandingRow(data);
}

function mapLandingRow(row: Record<string, unknown>): LandingPageRecord {
  return {
    id: String(row.id),
    doctor_id: String(row.doctor_id),
    slug: String(row.slug),
    status: row.status as LandingPageStatus,
    is_featured: Boolean(row.is_featured),
    draft_content: parseLandingContent(row.draft_content),
    published_content: row.published_content
      ? parseLandingContent(row.published_content)
      : null,
    published_at: (row.published_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function saveLandingDraft(
  doctorId: string,
  content: LandingContent,
  slug?: string,
): Promise<LandingPageRecord> {
  const payload: Record<string, unknown> = {
    draft_content: content,
  };
  if (slug) payload.slug = slug;

  const { data, error } = await table("doctor_landing_pages")
    .update(payload)
    .eq("doctor_id", doctorId)
    .select("*")
    .single();
  if (error) throw error;
  return mapLandingRow(data);
}

export async function publishLanding(
  doctorId: string,
  content: LandingContent,
  slug?: string,
): Promise<LandingPageRecord> {
  const payload: Record<string, unknown> = {
    draft_content: content,
    published_content: content,
    status: "published" as LandingPageStatus,
    published_at: new Date().toISOString(),
  };
  if (slug) payload.slug = slug;
  const { data, error } = await table("doctor_landing_pages")
    .update(payload)
    .eq("doctor_id", doctorId)
    .select("*")
    .single();
  if (error) throw error;
  return mapLandingRow(data);
}

export async function unpublishLanding(doctorId: string): Promise<LandingPageRecord> {
  const { data, error } = await table("doctor_landing_pages")
    .update({ status: "unpublished" as LandingPageStatus })
    .eq("doctor_id", doctorId)
    .select("*")
    .single();
  if (error) throw error;
  return mapLandingRow(data);
}

export async function updateLandingSlug(doctorId: string, slug: string): Promise<void> {
  const { error } = await table("doctor_landing_pages")
    .update({ slug })
    .eq("doctor_id", doctorId);
  if (error) throw error;
}

export interface CatalogService {
  id: string;
  name: string;
  description: string | null;
  default_fee: number;
  is_active: boolean;
}

export interface DoctorPublicServiceRow {
  id: string;
  service_id: string;
  is_visible: boolean;
  sort_order: number;
  consultation_types: string[];
  fee_override: number | null;
}

export async function getActiveCatalogServices(): Promise<CatalogService[]> {
  const { data, error } = await table("services")
    .select("id, name, description, default_fee, is_active")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as CatalogService[];
}

export async function getDoctorPublicServices(
  doctorId: string,
): Promise<DoctorPublicServiceRow[]> {
  const { data, error } = await table("doctor_public_services")
    .select("id, service_id, is_visible, sort_order, consultation_types, fee_override")
    .eq("doctor_id", doctorId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as DoctorPublicServiceRow[];
}

export async function saveDoctorPublicServices(
  doctorId: string,
  rows: Array<{
    service_id: string;
    is_visible: boolean;
    sort_order: number;
    consultation_types: string[];
    fee_override: number | null;
  }>,
): Promise<void> {
  const { error: delError } = await table("doctor_public_services")
    .delete()
    .eq("doctor_id", doctorId);
  if (delError) throw delError;
  if (!rows.length) return;
  const { error } = await table("doctor_public_services").insert(
    rows.map((row) => ({ ...row, doctor_id: doctorId })),
  );
  if (error) throw error;
}

export async function getDoctorReviews(doctorId: string): Promise<ModeratedReview[]> {
  const { data, error } = await table("reviews")
    .select(
      "id, doctor_id, appointment_id, patient_id, rating, comment, display_name, moderation_status, is_visible, created_at, moderated_at",
    )
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapReview);
}

function mapReview(row: Record<string, unknown>): ModeratedReview {
  return {
    id: String(row.id),
    doctorId: String(row.doctor_id),
    appointmentId: (row.appointment_id as string | null) ?? null,
    patientId: (row.patient_id as string | null) ?? null,
    rating: Number(row.rating ?? 0),
    comment: (row.comment as string | null) ?? null,
    displayName: (row.display_name as string | null) || "Patient",
    moderationStatus: row.moderation_status as ReviewModerationStatus,
    isVisible: Boolean(row.is_visible),
    createdAt: String(row.created_at ?? ""),
    moderatedAt: (row.moderated_at as string | null) ?? null,
  };
}

export async function hideDoctorReview(reviewId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("doctor_set_review_visibility", {
    p_review_id: reviewId,
    p_visible: false,
  });
  if (error) throw error;
}

export async function publishDoctorReview(reviewId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("doctor_moderate_own_review", {
    p_review_id: reviewId,
    p_status: "approved",
  });
  if (error) throw error;
}

export async function restoreDoctorReviewForModeration(reviewId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("doctor_set_review_visibility", {
    p_review_id: reviewId,
    p_visible: true,
  });
  if (error) throw error;
}

export async function addDoctorLandingReview(input: {
  doctorId: string;
  displayName: string;
  rating: number;
  comment?: string;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("doctor_add_landing_review", {
    p_doctor_id: input.doctorId,
    p_display_name: input.displayName,
    p_rating: input.rating,
    ...(input.comment ? { p_comment: input.comment } : {}),
  });
  if (error) throw error;
  return data as string;
}

export async function deleteDoctorLandingReview(reviewId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("doctor_delete_landing_review", {
    p_review_id: reviewId,
  });
  if (error) throw error;
}

export async function moderateReview(
  reviewId: string,
  status: Extract<ReviewModerationStatus, "approved" | "rejected">,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await table("reviews")
    .update({
      moderation_status: status,
      is_visible: status === "approved",
      moderated_at: new Date().toISOString(),
      moderated_by: user?.id ?? null,
    })
    .eq("id", reviewId);
  if (error) throw error;
}

export async function getAdminLandingPages(): Promise<AdminLandingPageRow[]> {
  const { data, error } = await table("doctor_landing_pages")
    .select(
      `id, doctor_id, slug, status, is_featured, updated_at, published_at,
       doctor:doctor_profiles!doctor_landing_pages_doctor_id_fkey (
         specialization,
         profile:profiles!doctor_profiles_user_id_fkey ( full_name )
       )`,
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const doctor = asRecord(row.doctor);
    const profile = asRecord(doctor.profile);
    return {
      id: String(row.id),
      doctorId: String(row.doctor_id),
      doctorName: String(profile.full_name ?? "Doctor"),
      specialization: String(doctor.specialization ?? ""),
      slug: String(row.slug),
      status: row.status as LandingPageStatus,
      isFeatured: Boolean(row.is_featured),
      updatedAt: String(row.updated_at),
      publishedAt: (row.published_at as string | null) ?? null,
    };
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function adminSetLandingStatus(
  doctorId: string,
  status: LandingPageStatus,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "published") {
    const { data } = await table("doctor_landing_pages")
      .select("draft_content, published_content")
      .eq("doctor_id", doctorId)
      .maybeSingle();
    patch.published_content = data?.published_content ?? data?.draft_content ?? {};
    patch.published_at = new Date().toISOString();
  }
  const { error } = await table("doctor_landing_pages").update(patch).eq("doctor_id", doctorId);
  if (error) throw error;
}

export async function adminSetFeatured(doctorId: string, featured: boolean): Promise<void> {
  const { error } = await table("doctor_landing_pages")
    .update({ is_featured: featured })
    .eq("doctor_id", doctorId);
  if (error) throw error;
}

export async function getAdminReviews(status?: ReviewModerationStatus): Promise<ModeratedReview[]> {
  let query = table("reviews")
    .select(
      "id, doctor_id, appointment_id, patient_id, rating, comment, display_name, moderation_status, is_visible, created_at, moderated_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("moderation_status", status);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapReview);
}

export async function getLandingDefaults(): Promise<LandingClinicDefaults> {
  const { data, error } = await table("platform_settings")
    .select("value")
    .eq("key", "doctor_landing_defaults")
    .maybeSingle();
  if (error || !data) return DEFAULT_CLINIC;
  const value = (data.value ?? {}) as Partial<LandingClinicDefaults>;
  return { ...DEFAULT_CLINIC, ...value };
}

export async function saveLandingDefaults(defaults: LandingClinicDefaults): Promise<void> {
  const { error } = await table("platform_settings")
    .update({ value: defaults, updated_at: new Date().toISOString() })
    .eq("key", "doctor_landing_defaults");
  if (error) throw error;
}
