"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Globe,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useDoctor } from "@/contexts/DoctorContext";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { uploadAndSetAvatar } from "@/lib/auth/profile";
import { uploadLandingImage } from "@/lib/storage/avatar";
import { getAvailabilitySlots } from "@/lib/doctor/api";
import { getErrorMessage } from "@/lib/errors";
import { DoctorLandingView } from "@/components/landing/DoctorLandingView";
import { ShareProfileBar } from "@/components/landing/ShareProfileBar";
import {
  getActiveCatalogServices,
  getDoctorLanding,
  getDoctorPublicServices,
  getDoctorReviews,
  addDoctorLandingReview,
  deleteDoctorLandingReview,
  hideDoctorReview,
  publishDoctorReview,
  publishLanding,
  restoreDoctorReviewForModeration,
  saveDoctorPublicServices,
  saveLandingDraft,
  unpublishLanding,
  type CatalogService,
  type DoctorPublicServiceRow,
} from "@/lib/landing/api";
import { parseLandingContent } from "@/lib/landing/content";
import { emptyLandingContent } from "@/lib/landing/defaults";
import { presentServices } from "@/lib/landing/display";
import { createId } from "@/lib/landing/slug";
import type {
  LandingContent,
  LandingPageRecord,
  LandingSectionId,
  LandingServiceCard,
  ModeratedReview,
  PublicLandingDoctor,
  PublicLandingPageData,
  ReviewModerationStatus,
} from "@/lib/landing/types";
import { LANDING_ACCENTS, LANDING_SECTION_IDS, LANDING_SOCIAL_PLATFORMS } from "@/lib/landing/types";
import { cn } from "@/lib/utils";

const NAV: { id: string; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "hero", label: "Hero" },
  { id: "about", label: "About" },
  { id: "expertise", label: "Diseases" },
  { id: "services", label: "Services" },
  { id: "results", label: "Before & After" },
  { id: "experience", label: "Experience" },
  { id: "reviews", label: "Reviews" },
  { id: "availability", label: "Availability" },
  { id: "clinic", label: "Clinic" },
  { id: "online", label: "Online" },
  { id: "faqs", label: "FAQs" },
  { id: "socials", label: "Social links" },
  { id: "seo", label: "SEO" },
  { id: "appearance", label: "Appearance" },
];

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  about: "About",
  expertise: "Diseases / Conditions",
  services: "Services",
  results: "Before & After",
  reviews: "Testimonials",
  availability: "Hours",
  clinic: "Clinic",
  online: "Online",
  faqs: "FAQs",
  cta: "Final CTA",
};

export function LandingEditor() {
  const { profile, doctorProfile, setProfile } = useDoctor();
  const [landing, setLanding] = useState<LandingPageRecord | null>(null);
  const [content, setContent] = useState<LandingContent>(() => emptyLandingContent());
  const [slug, setSlug] = useState("");
  const [section, setSection] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [selectedServices, setSelectedServices] = useState<DoctorPublicServiceRow[]>([]);
  const [reviews, setReviews] = useState<ModeratedReview[]>([]);
  const [availability, setAvailability] = useState<
    PublicLandingPageData["availability"]
  >([]);
  const [showPreview, setShowPreview] = useState(true);
  const [reviewFilter, setReviewFilter] = useState<ReviewModerationStatus | "all">("all");

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  };

  const patch = useCallback((partial: Partial<LandingContent>) => {
    setContent((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [page, services, mine, catalogRows, slots] = await Promise.all([
          getDoctorLanding(doctorProfile.id),
          getDoctorPublicServices(doctorProfile.id),
          getDoctorReviews(doctorProfile.id),
          getActiveCatalogServices(),
          getAvailabilitySlots(doctorProfile.id),
        ]);
        if (cancelled || !page) return;
        const parsed = parseLandingContent(page.draft_content, {
          fullName: profile.full_name,
          specialization: doctorProfile.specialization,
          qualification: doctorProfile.qualification,
          bio: doctorProfile.bio,
          experienceYears: doctorProfile.experience_years,
        });
        setLanding(page);
        setContent(parsed);
        setSlug(page.slug);
        setSelectedServices(services);
        setReviews(mine);
        setCatalog(catalogRows);
        setAvailability(
          (slots as Array<{
            day_of_week: number;
            start_time: string;
            end_time: string;
            slot_duration_minutes: number | null;
            is_active: boolean | null;
          }>)
            .filter((slot) => slot.is_active)
            .map((slot) => ({
              day_of_week: slot.day_of_week,
              start_time: slot.start_time,
              end_time: slot.end_time,
              slot_duration_minutes: slot.slot_duration_minutes ?? 30,
            })),
        );
      } catch (err) {
        showToast(getErrorMessage(err, "Failed to load landing page."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorProfile, profile.full_name]);

  const previewDoctor = useMemo<PublicLandingDoctor>(
    () => ({
      id: doctorProfile.id,
      slug,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      specialization: doctorProfile.specialization,
      subSpecialization: doctorProfile.sub_specialization,
      qualification: doctorProfile.qualification,
      experienceYears: doctorProfile.experience_years,
      pmdcNumber: doctorProfile.pmdc_number,
      bio: doctorProfile.bio,
      consultationFee: Number(doctorProfile.consultation_fee),
      followUpFee: doctorProfile.follow_up_fee,
      languages: doctorProfile.languages ?? ["Urdu", "English"],
      cities: doctorProfile.cities ?? (profile.city ? [profile.city] : []),
      hospitalAffiliations: doctorProfile.hospital_affiliations ?? [],
      rating: Number(doctorProfile.rating ?? 0),
      totalReviews: doctorProfile.total_reviews ?? 0,
      totalConsultations: doctorProfile.total_consultations ?? 0,
      isAvailable: Boolean(doctorProfile.is_available),
      taxonomyTags: [],
      gender: profile.gender,
    }),
    [doctorProfile, profile, slug],
  );

  const previewData = useMemo<PublicLandingPageData>(
    () => ({
      doctor: previewDoctor,
      content,
      status: landing?.status ?? "draft",
      slug,
      isPreview: true,
      services: presentServices(
        selectedServices.filter((row) => row.is_visible).length
          ? selectedServices
              .filter((row) => row.is_visible)
              .map((row) => {
                const service = catalog.find((item) => item.id === row.service_id);
                return {
                  id: row.id,
                  serviceId: row.service_id,
                  name: service?.name ?? "Service",
                  description: service?.description ?? "",
                  fee: row.fee_override ?? Number(service?.default_fee ?? doctorProfile.consultation_fee),
                  durationMinutes: availability[0]?.slot_duration_minutes ?? 30,
                  consultationTypes: row.consultation_types.filter(
                    (type): type is "in_person" | "video" | "chat" =>
                      type === "in_person" || type === "video" || type === "chat",
                  ),
                  isSynthetic: false,
                  imageUrl: null,
                  benefits: [],
                  featured: false,
                };
              })
          : [
              ...(content.physicalEnabled
                ? [
                    {
                      id: "synthetic-physical",
                      serviceId: "synthetic-physical",
                      name: "Physical Consultation",
                      description: `In-person visit with ${previewDoctor.fullName} at the clinic.`,
                      fee: Number(doctorProfile.consultation_fee),
                      durationMinutes: availability[0]?.slot_duration_minutes ?? 30,
                      consultationTypes: ["in_person" as const],
                      isSynthetic: true,
                      imageUrl: null,
                      benefits: [],
                      featured: false,
                    },
                  ]
                : []),
              ...(content.onlineEnabled
                ? [
                    {
                      id: "synthetic-online",
                      serviceId: "synthetic-online",
                      name: "Online Consultation",
                      description: `Secure video consultation with ${previewDoctor.fullName} from anywhere.`,
                      fee: Number(doctorProfile.consultation_fee),
                      durationMinutes: availability[0]?.slot_duration_minutes ?? 30,
                      consultationTypes: ["video" as const],
                      isSynthetic: true,
                      imageUrl: null,
                      benefits: [],
                      featured: false,
                    },
                  ]
                : []),
            ],
        content.serviceCards,
      ),
      reviews: reviews
        .filter((row) => row.moderationStatus === "approved" && row.isVisible)
        .map((row) => ({
          id: row.id,
          rating: row.rating,
          comment: row.comment,
          displayName: row.displayName,
          createdAt: row.createdAt,
        })),
      availability,
      organization: null,
    }),
    [
      availability,
      catalog,
      content,
      doctorProfile.consultation_fee,
      landing?.status,
      previewDoctor,
      reviews,
      selectedServices,
      slug,
    ],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveLandingDraft(doctorProfile.id, content, slug || undefined);
      await saveDoctorPublicServices(
        doctorProfile.id,
        selectedServices.map((row, index) => ({
          service_id: row.service_id,
          is_visible: row.is_visible,
          sort_order: index,
          consultation_types: row.consultation_types,
          fee_override: row.fee_override,
        })),
      );
      setLanding(saved);
      setSlug(saved.slug);
      showToast("Draft saved. Publish to update the public page.");
    } catch (err) {
      showToast(getErrorMessage(err, "Could not save draft."));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await saveDoctorPublicServices(
        doctorProfile.id,
        selectedServices.map((row, index) => ({
          service_id: row.service_id,
          is_visible: row.is_visible,
          sort_order: index,
          consultation_types: row.consultation_types,
          fee_override: row.fee_override,
        })),
      );
      const saved = await publishLanding(doctorProfile.id, content, slug);
      setLanding(saved);
      showToast("Your public page is live.");
    } catch (err) {
      showToast(getErrorMessage(err, "Could not publish."));
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setSaving(true);
    try {
      const saved = await unpublishLanding(doctorProfile.id);
      setLanding(saved);
      showToast("Public page unpublished.");
    } catch (err) {
      showToast(getErrorMessage(err, "Could not unpublish."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = landing?.status ?? "draft";

  return (
    <div className="space-y-4">
      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Public Profile</h1>
          <p className="text-sm text-muted-foreground">
            Customize the page patients see at{" "}
            <span className="font-medium text-foreground">/doctors/{slug}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowPreview((v) => !v)}>
            <Eye className="mr-1 h-4 w-4" />
            {showPreview ? "Hide preview" : "Preview"}
          </Button>
          <Link href={`/doctors/${slug}?preview=1`} target="_blank">
            <Button variant="outline">
              <Globe className="mr-1 h-4 w-4" />
              Open preview
            </Button>
          </Link>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-4 w-4" />
            Save draft
          </Button>
          {status === "published" ? (
            <Button variant="outline" onClick={handleUnpublish} disabled={saving}>
              Unpublish
            </Button>
          ) : null}
          <Button onClick={handlePublish} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Publish
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold uppercase",
            status === "published" && "bg-emerald-50 text-emerald-700",
            status === "draft" && "bg-amber-50 text-amber-700",
            status === "unpublished" && "bg-slate-100 text-slate-600",
          )}
        >
          {status}
        </span>
        <span className="text-muted-foreground">Unfinished edits stay private until you publish.</span>
      </div>

      {slug && <ShareProfileBar slug={slug} doctorName={profile.full_name} />}

      <div className={cn("grid gap-4", showPreview ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "")}>
        <div className="min-w-0 rounded-xl border border-border bg-card">
          <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium",
                  section === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="space-y-4 p-4 md:p-6">
            {section === "profile" && (
              <ProfileFields
                content={content}
                slug={slug}
                fullName={profile.full_name}
                avatarUrl={profile.avatar_url}
                onAvatar={async (file) => {
                  const updated = await uploadAndSetAvatar(profile.id, file);
                  setProfile(updated);
                }}
                onChange={patch}
                onSlug={setSlug}
              />
            )}
            {section === "hero" && (
              <HeroFields
                content={content}
                onChange={patch}
                onHero={async (file) => {
                  const url = await uploadLandingImage(profile.id, file, "hero");
                  patch({ heroImageUrl: url });
                }}
              />
            )}
            {section === "about" && (
              <AboutFields
                content={content}
                profileBio={doctorProfile.bio ?? ""}
                onChange={patch}
                onAboutImage={async (file) => {
                  const url = await uploadLandingImage(profile.id, file, "about");
                  patch({ aboutImageUrl: url });
                }}
              />
            )}
            {section === "expertise" && (
              <ExpertiseEditor
                content={content}
                userId={profile.id}
                onChange={patch}
              />
            )}
            {section === "services" && (
              <ServicesEditor
                catalog={catalog}
                selected={selectedServices}
                cards={content.serviceCards}
                userId={profile.id}
                onChange={setSelectedServices}
                onCards={(serviceCards) => patch({ serviceCards })}
              />
            )}
            {section === "results" && (
              <ResultsEditor
                content={content}
                userId={profile.id}
                onChange={patch}
              />
            )}
            {section === "experience" && (
              <ExperienceEditor content={content} onChange={patch} />
            )}
            {section === "reviews" && (
              <ReviewsEditor
                doctorId={doctorProfile.id}
                reviews={reviews}
                filter={reviewFilter}
                onFilter={setReviewFilter}
                onRefresh={async () => {
                  const mine = await getDoctorReviews(doctorProfile.id);
                  setReviews(mine);
                }}
                onPublish={async (id) => {
                  await publishDoctorReview(id);
                  setReviews((prev) =>
                    prev.map((row) =>
                      row.id === id
                        ? {
                            ...row,
                            isVisible: true,
                            moderationStatus: "approved",
                            moderatedAt: new Date().toISOString(),
                          }
                        : row,
                    ),
                  );
                }}
                onHide={async (id) => {
                  await hideDoctorReview(id);
                  setReviews((prev) =>
                    prev.map((row) =>
                      row.id === id
                        ? { ...row, isVisible: false, moderationStatus: "rejected" }
                        : row,
                    ),
                  );
                }}
                onRestore={async (id) => {
                  await restoreDoctorReviewForModeration(id);
                  setReviews((prev) =>
                    prev.map((row) =>
                      row.id === id
                        ? {
                            ...row,
                            isVisible: true,
                            moderationStatus: "approved",
                            moderatedAt: new Date().toISOString(),
                          }
                        : row,
                    ),
                  );
                }}
                onDelete={async (id) => {
                  await deleteDoctorLandingReview(id);
                  setReviews((prev) => prev.filter((row) => row.id !== id));
                }}
                onAdd={async (input) => {
                  await addDoctorLandingReview({
                    doctorId: doctorProfile.id,
                    ...input,
                  });
                  const mine = await getDoctorReviews(doctorProfile.id);
                  setReviews(mine);
                }}
              />
            )}
            {section === "availability" && (
              <div className="space-y-3 text-sm">
                <p>
                  This page uses your existing schedule. Physical and online hours both come from{" "}
                  <Link href="/doctor/schedule" className="font-medium text-primary underline">
                    Availability Schedule
                  </Link>
                  .
                </p>
                {availability.length === 0 && (
                  <p className="text-muted-foreground">No active hours yet. Add them in Schedule.</p>
                )}
              </div>
            )}
            {section === "clinic" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Clinic name" value={content.clinicName} onChange={(clinicName) => patch({ clinicName })} />
                <Field label="City" value={content.clinicCity} onChange={(clinicCity) => patch({ clinicCity })} />
                <Field
                  label="Address"
                  value={content.clinicAddress}
                  onChange={(clinicAddress) => patch({ clinicAddress })}
                  className="sm:col-span-2"
                />
                <Field label="Contact" value={content.clinicPhone} onChange={(clinicPhone) => patch({ clinicPhone })} />
                <Field
                  label="Email"
                  value={content.clinicEmail}
                  onChange={(clinicEmail) => patch({ clinicEmail })}
                />
                <Field
                  label="Opening hours"
                  value={content.clinicHours}
                  onChange={(clinicHours) => patch({ clinicHours })}
                />
                <Field
                  label="Map URL"
                  value={content.clinicMapUrl}
                  onChange={(clinicMapUrl) => patch({ clinicMapUrl })}
                />
                <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-3">
                  <Toggle
                    label="Show orange top bar (phone + address)"
                    checked={content.topBarEnabled}
                    onChange={(topBarEnabled) => patch({ topBarEnabled })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uses the Contact and Address fields above on the public header.
                  </p>
                </div>
                <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-3">
                  <Toggle
                    label="Show floating WhatsApp button"
                    checked={content.whatsappEnabled}
                    onChange={(whatsappEnabled) => patch({ whatsappEnabled })}
                  />
                  <Field
                    label="WhatsApp number (with country code)"
                    value={content.whatsappNumber}
                    onChange={(whatsappNumber) => patch({ whatsappNumber })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: 923001234567. If empty, the Contact phone number is used.
                  </p>
                </div>
                <Toggle
                  label="Offer physical consultations"
                  checked={content.physicalEnabled}
                  onChange={(physicalEnabled) => patch({ physicalEnabled })}
                />
              </div>
            )}
            {section === "online" && (
              <div className="space-y-3">
                <Toggle
                  label="Offer online consultations"
                  checked={content.onlineEnabled}
                  onChange={(onlineEnabled) => patch({ onlineEnabled })}
                />
                <Field
                  label="Headline"
                  value={content.onlineHeadline}
                  onChange={(onlineHeadline) => patch({ onlineHeadline })}
                />
                <TextArea
                  label="How it works"
                  value={content.onlineDescription}
                  onChange={(onlineDescription) => patch({ onlineDescription })}
                />
              </div>
            )}
            {section === "faqs" && <FaqEditor content={content} onChange={patch} />}
            {section === "socials" && <SocialEditor content={content} onChange={patch} />}
            {section === "seo" && (
              <div className="space-y-3">
                <Field
                  label="SEO title"
                  value={content.seoTitle}
                  onChange={(seoTitle) => patch({ seoTitle })}
                />
                <TextArea
                  label="SEO description"
                  value={content.seoDescription}
                  onChange={(seoDescription) => patch({ seoDescription })}
                />
                <div>
                  <Label>Open Graph image</Label>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
                    <Upload className="h-4 w-4" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadLandingImage(profile.id, file, "og");
                        patch({ ogImageUrl: url });
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
            {section === "appearance" && (
              <AppearanceEditor content={content} onChange={patch} />
            )}
          </div>
        </div>

        {showPreview && (
          <div className="hidden min-h-[70vh] overflow-hidden rounded-xl border border-border bg-slate-100 xl:block">
            <div className="border-b border-border bg-white px-4 py-2 text-xs font-medium text-muted-foreground">
              Live preview
            </div>
            <div className="h-[calc(100%-2.5rem)] overflow-auto">
              <div className="origin-top scale-[0.72]" style={{ width: "138.8%" }}>
                <DoctorLandingView data={previewData} preview />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  className,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input
        className="mt-1"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        className="mt-1 min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ProfileFields({
  content,
  slug,
  fullName,
  avatarUrl,
  onAvatar,
  onChange,
  onSlug,
}: {
  content: LandingContent;
  slug: string;
  fullName: string;
  avatarUrl: string | null;
  onAvatar: (file: File) => Promise<void>;
  onChange: (partial: Partial<LandingContent>) => void;
  onSlug: (slug: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <AvatarUpload name={fullName} avatarUrl={avatarUrl} onUpload={onAvatar} />
        <div className="text-sm text-muted-foreground">
          Profile photo is the default portrait on the public page.
        </div>
      </div>
      <Field label="Full name" value={fullName} readOnly />
      <Field
        label="Public URL slug"
        value={slug}
        onChange={(value) => onSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
      />
      <Field
        label="Professional title"
        value={content.professionalTitle}
        onChange={(professionalTitle) => onChange({ professionalTitle })}
      />
    </div>
  );
}

function HeroFields({
  content,
  onChange,
  onHero,
}: {
  content: LandingContent;
  onChange: (partial: Partial<LandingContent>) => void;
  onHero: (file: File) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Hero headline"
        value={content.heroHeadline}
        onChange={(heroHeadline) => onChange({ heroHeadline })}
      />
      <TextArea
        label="Short introduction"
        value={content.shortIntro}
        onChange={(shortIntro) => onChange({ shortIntro })}
      />
      <Field
        label="Primary CTA"
        value={content.ctaPrimaryText}
        onChange={(ctaPrimaryText) => onChange({ ctaPrimaryText })}
      />
      <Field
        label="Secondary CTA"
        value={content.ctaSecondaryText}
        onChange={(ctaSecondaryText) => onChange({ ctaSecondaryText })}
      />
      <ImageField
        label="Hero portrait"
        url={content.heroImageUrl}
        onUpload={onHero}
        onClear={() => onChange({ heroImageUrl: null })}
      />
      <p className="text-xs text-muted-foreground">
        Use a portrait photo for the large hero image. Logos look weak here — keep the mark for the header.
      </p>
    </div>
  );
}

function AboutFields({
  content,
  profileBio,
  onChange,
  onAboutImage,
}: {
  content: LandingContent;
  profileBio: string;
  onChange: (partial: Partial<LandingContent>) => void;
  onAboutImage: (file: File) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <Field
        label="About heading"
        value={content.aboutHeadline}
        onChange={(aboutHeadline) => onChange({ aboutHeadline })}
      />
      <TextArea
        label="About text"
        value={content.aboutBody}
        onChange={(aboutBody) => onChange({ aboutBody })}
      />
      {profileBio && !content.aboutBody && (
        <p className="text-xs text-muted-foreground">
          Empty about text falls back to your professional bio.
        </p>
      )}
      <TextArea
        label="Professional philosophy (optional quote)"
        value={content.philosophy}
        onChange={(philosophy) => onChange({ philosophy })}
      />
      <div>
        <Label>Checklist highlights</Label>
        <div className="mt-2 space-y-2">
          {content.aboutHighlights.map((line, index) => (
            <Input
              key={index}
              value={line}
              onChange={(e) => {
                const aboutHighlights = [...content.aboutHighlights];
                aboutHighlights[index] = e.target.value;
                onChange({ aboutHighlights });
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange({ aboutHighlights: [...content.aboutHighlights, ""] })}
          >
            Add highlight
          </Button>
          {content.aboutHighlights.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange({ aboutHighlights: content.aboutHighlights.slice(0, -1) })}
            >
              Remove last
            </Button>
          )}
        </div>
      </div>
      <ImageField
        label="About image"
        url={content.aboutImageUrl}
        onUpload={onAboutImage}
        onClear={() => onChange({ aboutImageUrl: null })}
      />
    </div>
  );
}

function ImageField({
  label,
  url,
  onUpload,
  onClear,
}: {
  label: string;
  url: string | null;
  onUpload: (file: File) => Promise<void>;
  onClear?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      {url && (
        <div className="relative mt-2 h-28 w-44 overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
          <Upload className="h-4 w-4" />
          {busy ? "Uploading…" : url ? "Replace image" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              try {
                await onUpload(file);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {url && onClear && (
          <button type="button" className="text-sm text-muted-foreground" onClick={onClear}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function ExpertiseEditor({
  content,
  userId,
  onChange,
}: {
  content: LandingContent;
  userId: string;
  onChange: (partial: Partial<LandingContent>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Conditions and diseases shown as cards on the public page. Add a name, short detail, and
        optional image for each.
      </p>
      {content.expertise.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-lg border border-border p-3">
          <Input
            placeholder="Condition / disease name"
            value={item.label}
            onChange={(e) => {
              const expertise = [...content.expertise];
              expertise[index] = { ...item, label: e.target.value };
              onChange({ expertise });
            }}
          />
          <Input
            placeholder="Short detail (1–2 lines)"
            value={item.description}
            onChange={(e) => {
              const expertise = [...content.expertise];
              expertise[index] = { ...item, description: e.target.value };
              onChange({ expertise });
            }}
          />
          <ImageField
            label="Card image"
            url={item.imageUrl}
            onUpload={async (file) => {
              const imageUrl = await uploadLandingImage(
                userId,
                file,
                `disease-${item.id.slice(0, 8)}`,
              );
              const expertise = [...content.expertise];
              expertise[index] = { ...item, imageUrl };
              onChange({ expertise });
            }}
            onClear={() => {
              const expertise = [...content.expertise];
              expertise[index] = { ...item, imageUrl: null };
              onChange({ expertise });
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onChange({ expertise: content.expertise.filter((row) => row.id !== item.id) })
            }
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() =>
          onChange({
            expertise: [
              ...content.expertise,
              { id: createId("spec"), label: "", description: "", imageUrl: null },
            ],
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Add condition
      </Button>
    </div>
  );
}

function upsertCard(
  cards: LandingServiceCard[],
  serviceId: string,
  partial: Partial<LandingServiceCard>,
): LandingServiceCard[] {
  const existing = cards.find((card) => card.serviceId === serviceId);
  if (existing) {
    return cards.map((card) => (card.serviceId === serviceId ? { ...card, ...partial } : card));
  }
  return [
    ...cards,
    {
      serviceId,
      displayName: "",
      shortDescription: "",
      imageUrl: null,
      benefits: [],
      featured: false,
      ...partial,
    },
  ];
}

function ServicesEditor({
  catalog,
  selected,
  cards,
  userId,
  onChange,
  onCards,
}: {
  catalog: CatalogService[];
  selected: DoctorPublicServiceRow[];
  cards: LandingServiceCard[];
  userId: string;
  onChange: (rows: DoctorPublicServiceRow[]) => void;
  onCards: (cards: LandingServiceCard[]) => void;
}) {
  const selectedIds = new Set(selected.map((row) => row.service_id));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose clinic services, then add a card image, short detail, and up to three bullet points.
      </p>
      {catalog.map((service) => {
        const row = selected.find((item) => item.service_id === service.id);
        const card = cards.find((item) => item.serviceId === service.id);
        const checked = Boolean(row);
        return (
          <div key={service.id} className="rounded-lg border border-border p-3">
            <label className="flex items-start gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([
                      ...selected,
                      {
                        id: createId("svc"),
                        service_id: service.id,
                        is_visible: true,
                        sort_order: selected.length,
                        consultation_types: ["in_person"],
                        fee_override: null,
                      },
                    ]);
                  } else {
                    onChange(selected.filter((item) => item.service_id !== service.id));
                    onCards(cards.filter((item) => item.serviceId !== service.id));
                  }
                }}
              />
              <span>
                {service.name}
                <span className="block text-xs font-normal text-muted-foreground">
                  {service.description} · PKR {Math.round(service.default_fee).toLocaleString("en-PK")}
                </span>
              </span>
            </label>
            {row && (
              <div className="mt-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs">
                    Types
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-input px-2 text-sm"
                      value={row.consultation_types[0] ?? "in_person"}
                      onChange={(e) =>
                        onChange(
                          selected.map((item) =>
                            item.service_id === service.id
                              ? { ...item, consultation_types: [e.target.value] }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="in_person">Physical</option>
                      <option value="video">Online</option>
                      <option value="chat">Chat</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Fee override (optional)
                    <Input
                      className="mt-1"
                      type="number"
                      value={row.fee_override ?? ""}
                      onChange={(e) =>
                        onChange(
                          selected.map((item) =>
                            item.service_id === service.id
                              ? {
                                  ...item,
                                  fee_override: e.target.value ? Number(e.target.value) : null,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <Field
                  label="Card title override"
                  value={card?.displayName ?? ""}
                  onChange={(displayName) => onCards(upsertCard(cards, service.id, { displayName }))}
                />
                <TextArea
                  label="Short detail on the card"
                  value={card?.shortDescription ?? ""}
                  onChange={(shortDescription) =>
                    onCards(upsertCard(cards, service.id, { shortDescription }))
                  }
                />
                <div>
                  <Label>Bullet details (up to 3)</Label>
                  {[0, 1, 2].map((index) => (
                    <Input
                      key={index}
                      className="mt-2"
                      placeholder={`Benefit ${index + 1}`}
                      value={card?.benefits[index] ?? ""}
                      onChange={(e) => {
                        const benefits = [...(card?.benefits ?? [])];
                        benefits[index] = e.target.value;
                        onCards(
                          upsertCard(cards, service.id, {
                            benefits: benefits.filter((line) => line.trim()),
                          }),
                        );
                      }}
                    />
                  ))}
                </div>
                <ImageField
                  label="Card image"
                  url={card?.imageUrl ?? null}
                  onUpload={async (file) => {
                    const imageUrl = await uploadLandingImage(
                      userId,
                      file,
                      `service-${service.id.slice(0, 8)}`,
                    );
                    onCards(upsertCard(cards, service.id, { imageUrl }));
                  }}
                  onClear={() => onCards(upsertCard(cards, service.id, { imageUrl: null }))}
                />
                <Toggle
                  label="Mark as most popular"
                  checked={Boolean(card?.featured)}
                  onChange={(featured) =>
                    onCards(
                      upsertCard(cards, service.id, { featured }).map((item) =>
                        item.serviceId === service.id ? item : { ...item, featured: false },
                      ),
                    )
                  }
                />
              </div>
            )}
          </div>
        );
      })}
      {catalog.length === 0 && <p className="text-sm text-muted-foreground">No clinic services yet.</p>}
      {selectedIds.size === 0 && (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
          <p className="text-xs text-muted-foreground">
            No catalog services selected — default consultation cards will show. You can still add images and details.
          </p>
          {(["synthetic-physical", "synthetic-online"] as const).map((id) => {
            const card = cards.find((item) => item.serviceId === id);
            const label = id === "synthetic-physical" ? "Physical Consultation" : "Online Consultation";
            return (
              <div key={id} className="space-y-2 rounded-md border border-border p-3">
                <p className="text-sm font-medium">{label}</p>
                <TextArea
                  label="Short detail"
                  value={card?.shortDescription ?? ""}
                  onChange={(shortDescription) => onCards(upsertCard(cards, id, { shortDescription }))}
                />
                <ImageField
                  label="Card image"
                  url={card?.imageUrl ?? null}
                  onUpload={async (file) => {
                    const imageUrl = await uploadLandingImage(userId, file, id);
                    onCards(upsertCard(cards, id, { imageUrl }));
                  }}
                  onClear={() => onCards(upsertCard(cards, id, { imageUrl: null }))}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultsEditor({
  content,
  userId,
  onChange,
}: {
  content: LandingContent;
  userId: string;
  onChange: (partial: Partial<LandingContent>) => void;
}) {
  const visible = content.sections.find((item) => item.id === "results")?.visible ?? false;
  const setVisible = (next: boolean) => {
    onChange({
      sections: LANDING_SECTION_IDS.map((id) => ({
        id,
        visible:
          id === "results"
            ? next
            : (content.sections.find((item) => item.id === id)?.visible ?? true),
      })),
    });
  };

  return (
    <div className="space-y-4">
      <Toggle
        label="Show before & after on the public page"
        checked={visible}
        onChange={setVisible}
      />
      <p className="text-sm text-muted-foreground">
        Optional. Hidden until you turn this on and upload at least one before/after pair.
      </p>
      {content.beforeAfterItems.map((item, index) => (
        <div key={item.id} className="space-y-3 rounded-lg border border-border p-3">
          <Field
            label="Treatment title"
            value={item.title}
            onChange={(title) => {
              const beforeAfterItems = [...content.beforeAfterItems];
              beforeAfterItems[index] = { ...item, title };
              onChange({ beforeAfterItems });
            }}
          />
          <Field
            label="Caption"
            value={item.caption}
            onChange={(caption) => {
              const beforeAfterItems = [...content.beforeAfterItems];
              beforeAfterItems[index] = { ...item, caption };
              onChange({ beforeAfterItems });
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ImageField
              label="Before"
              url={item.beforeUrl || null}
              onUpload={async (file) => {
                const beforeUrl = await uploadLandingImage(userId, file, `before-${item.id.slice(0, 8)}`);
                const beforeAfterItems = [...content.beforeAfterItems];
                beforeAfterItems[index] = { ...item, beforeUrl };
                onChange({ beforeAfterItems });
              }}
            />
            <ImageField
              label="After"
              url={item.afterUrl || null}
              onUpload={async (file) => {
                const afterUrl = await uploadLandingImage(userId, file, `after-${item.id.slice(0, 8)}`);
                const beforeAfterItems = [...content.beforeAfterItems];
                beforeAfterItems[index] = { ...item, afterUrl };
                onChange({ beforeAfterItems });
              }}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onChange({
                beforeAfterItems: content.beforeAfterItems.filter((row) => row.id !== item.id),
              })
            }
          >
            Remove pair
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() =>
          onChange({
            beforeAfterItems: [
              ...content.beforeAfterItems,
              { id: createId("ba"), title: "", beforeUrl: "", afterUrl: "", caption: "" },
            ],
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Add before & after
      </Button>
    </div>
  );
}

function ExperienceEditor({
  content,
  onChange,
}: {
  content: LandingContent;
  onChange: (partial: Partial<LandingContent>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Education</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                education: [
                  ...content.education,
                  { id: createId("edu"), degree: "", institution: "", year: "" },
                ],
              })
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        {content.education.map((item, index) => (
          <div key={item.id} className="mb-2 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
            <Input
              placeholder="Degree"
              value={item.degree}
              onChange={(e) => {
                const education = [...content.education];
                education[index] = { ...item, degree: e.target.value };
                onChange({ education });
              }}
            />
            <Input
              placeholder="Institution"
              value={item.institution}
              onChange={(e) => {
                const education = [...content.education];
                education[index] = { ...item, institution: e.target.value };
                onChange({ education });
              }}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Year"
                value={item.year}
                onChange={(e) => {
                  const education = [...content.education];
                  education[index] = { ...item, year: e.target.value };
                  onChange({ education });
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  onChange({ education: content.education.filter((row) => row.id !== item.id) })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Experience</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                experienceItems: [
                  ...content.experienceItems,
                  { id: createId("exp"), title: "", organization: "", years: "" },
                ],
              })
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        {content.experienceItems.map((item, index) => (
          <div key={item.id} className="mb-2 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
            <Input
              placeholder="Role"
              value={item.title}
              onChange={(e) => {
                const experienceItems = [...content.experienceItems];
                experienceItems[index] = { ...item, title: e.target.value };
                onChange({ experienceItems });
              }}
            />
            <Input
              placeholder="Organization"
              value={item.organization}
              onChange={(e) => {
                const experienceItems = [...content.experienceItems];
                experienceItems[index] = { ...item, organization: e.target.value };
                onChange({ experienceItems });
              }}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Years"
                value={item.years}
                onChange={(e) => {
                  const experienceItems = [...content.experienceItems];
                  experienceItems[index] = { ...item, years: e.target.value };
                  onChange({ experienceItems });
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  onChange({
                    experienceItems: content.experienceItems.filter((row) => row.id !== item.id),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqEditor({
  content,
  onChange,
}: {
  content: LandingContent;
  onChange: (partial: Partial<LandingContent>) => void;
}) {
  return (
    <div className="space-y-3">
      {content.faqs.map((faq, index) => (
        <div key={faq.id} className="space-y-2 rounded-lg border border-border p-3">
          <Input
            value={faq.question}
            placeholder="Question"
            onChange={(e) => {
              const faqs = [...content.faqs];
              faqs[index] = { ...faq, question: e.target.value };
              onChange({ faqs });
            }}
          />
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-input px-3 py-2 text-sm"
            value={faq.answer}
            placeholder="Answer"
            onChange={(e) => {
              const faqs = [...content.faqs];
              faqs[index] = { ...faq, answer: e.target.value };
              onChange({ faqs });
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ faqs: content.faqs.filter((row) => row.id !== faq.id) })}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() =>
          onChange({
            faqs: [...content.faqs, { id: createId("faq"), question: "", answer: "" }],
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Add FAQ
      </Button>
    </div>
  );
}

function SocialEditor({
  content,
  onChange,
}: {
  content: LandingContent;
  onChange: (partial: Partial<LandingContent>) => void;
}) {
  return (
    <div className="space-y-3">
      {LANDING_SOCIAL_PLATFORMS.map((platform) => {
        const existing = content.socials.find((item) => item.platform === platform);
        return (
          <Field
            key={platform}
            label={platform}
            value={existing?.url ?? ""}
            onChange={(url) => {
              const others = content.socials.filter((item) => item.platform !== platform);
              onChange({
                socials: url.trim()
                  ? [...others, { platform, url: url.trim() }]
                  : others,
              });
            }}
          />
        );
      })}
    </div>
  );
}

function AppearanceEditor({
  content,
  onChange,
}: {
  content: LandingContent;
  onChange: (partial: Partial<LandingContent>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Accent</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {LANDING_ACCENTS.map((accent) => (
            <button
              key={accent}
              type="button"
              onClick={() => onChange({ accent })}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                content.accent === accent ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {accent}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Button style</Label>
        <div className="mt-2 flex gap-2">
          {(["rounded", "pill"] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ buttonStyle: style })}
              className={cn(
                "px-3 py-1 text-xs font-semibold capitalize",
                style === "pill" ? "rounded-full" : "rounded-lg",
                content.buttonStyle === style ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
      <Field
        label="Primary CTA"
        value={content.ctaPrimaryText}
        onChange={(ctaPrimaryText) => onChange({ ctaPrimaryText })}
      />
      <Field
        label="Secondary CTA"
        value={content.ctaSecondaryText}
        onChange={(ctaSecondaryText) => onChange({ ctaSecondaryText })}
      />
      <Field
        label="Banner headline"
        value={content.ctaBannerHeadline}
        onChange={(ctaBannerHeadline) => onChange({ ctaBannerHeadline })}
      />
      <Field
        label="Footer tagline"
        value={content.footerTagline}
        onChange={(footerTagline) => onChange({ footerTagline })}
      />
      <div>
        <Label>Trust bar labels</Label>
        <div className="mt-2 space-y-2">
          {content.trustItems.map((item, index) => (
            <Input
              key={index}
              value={item}
              onChange={(e) => {
                const trustItems = [...content.trustItems];
                trustItems[index] = e.target.value;
                onChange({ trustItems });
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <Label>Visible sections</Label>
        <div className="mt-2 space-y-2">
          {LANDING_SECTION_IDS.map((id) => {
            const current = content.sections.find((item) => item.id === id);
            return (
              <Toggle
                key={id}
                label={SECTION_LABELS[id] ?? id}
                checked={current?.visible ?? id !== "results"}
                onChange={(visible) =>
                  onChange({
                    sections: LANDING_SECTION_IDS.map((sectionId) => ({
                      id: sectionId as LandingSectionId,
                      visible:
                        sectionId === id
                          ? visible
                          : (content.sections.find((item) => item.id === sectionId)?.visible ??
                            sectionId !== "results"),
                    })),
                  })
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReviewsEditor({
  reviews,
  filter,
  onFilter,
  onPublish,
  onHide,
  onRestore,
  onDelete,
  onAdd,
}: {
  doctorId: string;
  reviews: ModeratedReview[];
  filter: ReviewModerationStatus | "all";
  onFilter: (value: ReviewModerationStatus | "all") => void;
  onRefresh: () => Promise<void>;
  onPublish: (id: string) => Promise<void>;
  onHide: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: (input: { displayName: string; rating: number; comment?: string }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered =
    filter === "all" ? reviews : reviews.filter((row) => row.moderationStatus === filter);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await onAdd({
        displayName: displayName.trim(),
        rating: Number(rating),
        comment: comment.trim() || undefined,
      });
      setDisplayName("");
      setRating("5");
      setComment("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not add review."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-border p-3">
        <p className="text-sm font-medium">Add a review</p>
        <p className="text-xs text-muted-foreground">
          Reviews you add go live on your page immediately — no admin approval needed.
        </p>
        <Field label="Patient / display name" value={displayName} onChange={setDisplayName} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Rating</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} stars
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Comment</Label>
          <textarea
            className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What the patient said…"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          size="sm"
          disabled={busy || !displayName.trim()}
          onClick={() => void submit()}
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Publish review
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => onFilter(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No reviews in this list.</p>
      )}
      {filtered.map((review) => (
        <article key={review.id} className="rounded-lg border border-border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{review.displayName}</p>
            <span className="text-xs uppercase text-muted-foreground">{review.moderationStatus}</span>
          </div>
          <p className="mt-1 text-amber-600">{review.rating}/5</p>
          {review.comment && <p className="mt-2 text-muted-foreground">{review.comment}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {review.moderationStatus !== "approved" && (
              <Button size="sm" onClick={() => onPublish(review.id)}>
                Publish
              </Button>
            )}
            {review.moderationStatus === "approved" && (
              <Button size="sm" variant="outline" onClick={() => onHide(review.id)}>
                Hide
              </Button>
            )}
            {review.moderationStatus === "rejected" && (
              <Button size="sm" variant="outline" onClick={() => onRestore(review.id)}>
                Publish again
              </Button>
            )}
            {!review.patientId && (
              <Button size="sm" variant="outline" onClick={() => onDelete(review.id)}>
                Delete
              </Button>
            )}
          </div>
        </article>
      ))}
      <p className="text-xs text-muted-foreground">
        You can publish or hide patient reviews yourself. Doctor-added reviews appear publicly right
        away.
      </p>
    </div>
  );
}
