import { mapToDoctorCard } from "@/lib/patient/mappers";
import type { DoctorWithProfile } from "@/lib/patient/types";
import { matchesDoctorTaxonomyTag } from "@/lib/doctor/taxonomy";
import {
  anyTokenMatchesWord,
  getQueryWords,
  getTextTokens,
  matchesPersonName,
  normalizeSearchText,
  wordMatchesNormalizedBlob,
} from "@/lib/search/flexible-match";
import {
  findTaxonomyItemById,
  getTaxonomyFilterLabel,
  MENTAL_CONDITIONS,
  MENTAL_SYMPTOMS,
} from "./catalog";

export { getPersonSearchWords, matchesPersonName } from "@/lib/search/flexible-match";

export const ALL_CITIES_LABEL = "All Cities";

export interface DoctorSearchFilters {
  q?: string;
  city?: string;
  specialty?: string;
  symptom?: string;
  condition?: string;
  maxFee?: number;
  minRating?: number;
  topReviewed?: boolean;
  availableNow?: boolean;
}

export function parseDoctorSearchParams(params: URLSearchParams): DoctorSearchFilters {
  const maxFee = params.get("maxFee");
  const minRating = params.get("minRating");

  return {
    q: params.get("q") ?? undefined,
    city: params.get("city") ?? undefined,
    specialty: params.get("specialty") ?? undefined,
    symptom: params.get("symptom") ?? undefined,
    condition: params.get("condition") ?? undefined,
    maxFee: maxFee ? Number(maxFee) : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    topReviewed: params.get("topReviewed") === "true",
    availableNow: params.get("availableNow") === "true",
  };
}

export function buildDoctorSearchUrl(filters: DoctorSearchFilters): string {
  const params = new URLSearchParams();

  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.city && filters.city !== ALL_CITIES_LABEL) params.set("city", filters.city);
  if (filters.specialty && filters.specialty !== "All") params.set("specialty", filters.specialty);
  if (filters.symptom) params.set("symptom", filters.symptom);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.maxFee) params.set("maxFee", String(filters.maxFee));
  if (filters.minRating) params.set("minRating", String(filters.minRating));
  if (filters.topReviewed) params.set("topReviewed", "true");
  if (filters.availableNow) params.set("availableNow", "true");

  const query = params.toString();
  return query ? `/doctors?${query}` : "/doctors";
}

function doctorCities(doc: DoctorWithProfile): string[] {
  const fromArray = doc.cities?.length ? doc.cities : [];
  const fromProfile = doc.profile?.city ? [doc.profile.city] : [];
  return [...new Set([...fromArray, ...fromProfile])];
}

function matchesDoctorName(doc: DoctorWithProfile, q: string): boolean {
  return matchesPersonName(doc.profile?.full_name ?? "", q);
}

function getDoctorSearchBlob(doc: DoctorWithProfile): string {
  return normalizeSearchText(
    [
      doc.profile?.full_name,
      doc.specialization,
      doc.sub_specialization,
      doc.bio,
      ...(doc.qualification ?? []),
      ...doctorCities(doc),
      ...(doc.languages ?? []),
      ...(doc.hospital_affiliations ?? []),
      ...(doc.taxonomy_tags ?? []).map((tag) => tag.label),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getDoctorFieldTokens(doc: DoctorWithProfile): string[] {
  return getTextTokens(
    doc.specialization,
    doc.sub_specialization,
    doc.bio,
    ...(doc.qualification ?? []),
    ...doctorCities(doc),
    ...(doc.languages ?? []),
    ...(doc.hospital_affiliations ?? []),
    ...(doc.taxonomy_tags ?? []).map((tag) => tag.label)
  );
}

function matchesCatalogWord(doc: DoctorWithProfile, word: string): boolean {
  for (const item of [...MENTAL_SYMPTOMS, ...MENTAL_CONDITIONS]) {
    const terms = [item.label, ...item.keywords].map(normalizeSearchText);
    const termHit = terms.some((term) => anyTokenMatchesWord(getTextTokens(term), word));
    if (!termHit) continue;

    const specialtyMatch = item.specialty
      ? normalizeSearchText(doc.specialization).includes(
          normalizeSearchText(item.specialty)
        )
      : false;

    if (specialtyMatch || matchesKeywords(doc, item.keywords)) {
      return true;
    }
  }
  return false;
}

function matchesFreeTextQuery(doc: DoctorWithProfile, q: string): boolean {
  const words = getQueryWords(q);
  if (words.length === 0) return true;

  if (matchesDoctorName(doc, q)) return true;

  const fieldTokens = getDoctorFieldTokens(doc);
  const blob = getDoctorSearchBlob(doc);

  return words.every(
    (word) =>
      anyTokenMatchesWord(fieldTokens, word) ||
      matchesCatalogWord(doc, word) ||
      wordMatchesNormalizedBlob(blob, word)
  );
}

function matchesKeywords(doc: DoctorWithProfile, keywords: string[]): boolean {
  const fieldTokens = getDoctorFieldTokens(doc);
  return keywords.some((kw) => anyTokenMatchesWord(fieldTokens, normalizeSearchText(kw)));
}

function matchesCity(doc: DoctorWithProfile, city: string): boolean {
  const cityNorm = normalizeSearchText(city);
  return doctorCities(doc).some((c) => {
    const docCity = normalizeSearchText(c);
    return (
      docCity === cityNorm ||
      docCity.includes(cityNorm) ||
      cityNorm.includes(docCity)
    );
  });
}

function matchesTaxonomyTag(doc: DoctorWithProfile, tagId: string): boolean {
  const item = findTaxonomyItemById(tagId);
  return matchesDoctorTaxonomyTag(doc, tagId, item);
}

function matchesSpecialty(doc: DoctorWithProfile, specialty: string): boolean {
  const spec = normalizeSearchText(specialty);
  const docSpec = normalizeSearchText(doc.specialization ?? "");
  const docSubSpec = normalizeSearchText(doc.sub_specialization ?? "");

  if (
    docSpec.includes(spec) ||
    spec.includes(docSpec) ||
    docSubSpec.includes(spec) ||
    spec.includes(docSubSpec)
  ) {
    return true;
  }

  return (doc.taxonomy_tags ?? []).some((tag) => {
    const label = normalizeSearchText(tag.label);
    return label.includes(spec) || spec.includes(label);
  });
}

export function filterDoctors(
  doctors: DoctorWithProfile[],
  filters: DoctorSearchFilters
): ReturnType<typeof mapToDoctorCard>[] {
  let result = [...doctors];

  if (filters.city && filters.city !== ALL_CITIES_LABEL) {
    result = result.filter((doc) => matchesCity(doc, filters.city!));
  }

  if (filters.specialty && filters.specialty !== "All") {
    result = result.filter((doc) => matchesSpecialty(doc, filters.specialty!));
  }

  if (filters.q?.trim()) {
    result = result.filter((doc) => matchesFreeTextQuery(doc, filters.q!));
  }

  if (filters.symptom) {
    result = result.filter((doc) => matchesTaxonomyTag(doc, filters.symptom!));
  }

  if (filters.condition) {
    result = result.filter((doc) => matchesTaxonomyTag(doc, filters.condition!));
  }

  if (filters.maxFee) {
    result = result.filter((doc) => Number(doc.consultation_fee) <= filters.maxFee!);
  }

  if (filters.minRating) {
    result = result.filter((doc) => Number(doc.rating) >= filters.minRating!);
  }

  if (filters.topReviewed) {
    result = result.filter(
      (doc) => Number(doc.rating) >= 4 || (doc.total_reviews ?? 0) >= 5
    );
  }

  if (filters.availableNow) {
    result = result.filter((doc) => doc.is_available);
  }

  if (filters.topReviewed || filters.minRating) {
    result.sort(
      (a, b) =>
        Number(b.rating) - Number(a.rating) ||
        (b.total_reviews ?? 0) - (a.total_reviews ?? 0)
    );
  }

  return result.map(mapToDoctorCard);
}

export function getActiveFilterCount(filters: DoctorSearchFilters): number {
  let count = 0;
  if (filters.q?.trim()) count++;
  if (filters.city && filters.city !== ALL_CITIES_LABEL) count++;
  if (filters.specialty && filters.specialty !== "All") count++;
  if (filters.symptom) count++;
  if (filters.condition) count++;
  if (filters.maxFee) count++;
  if (filters.minRating) count++;
  if (filters.topReviewed) count++;
  if (filters.availableNow) count++;
  return count;
}

export function getActiveTaxonomyFilter(filters: DoctorSearchFilters) {
  const id = filters.symptom ?? filters.condition;
  if (!id) return null;
  const item = findTaxonomyItemById(id);
  if (!item) return null;
  return {
    id,
    label: item.label,
    kind: item.kind,
  };
}

export function buildFilterTitle(filters: DoctorSearchFilters): string {
  const parts: string[] = [];
  const taxonomyLabel = getTaxonomyFilterLabel(filters);

  if (filters.specialty && filters.specialty !== "All") {
    parts.push(`Best ${filters.specialty}s`);
  } else if (taxonomyLabel) {
    parts.push(`Doctors for ${taxonomyLabel}`);
  } else {
    parts.push("Verified Doctors");
  }

  if (filters.city && filters.city !== ALL_CITIES_LABEL) {
    parts.push(`In ${filters.city}`);
  }

  return parts.join(" ");
}
