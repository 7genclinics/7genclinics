import { buildDoctorSearchUrl } from "@/lib/public/doctor-filters";
import type { Specialization } from "@/types";

export type SpecialtyIconId =
  | "breast-oncologist"
  | "child-specialist"
  | "clinical-psychologist"
  | "clinical-sexologist"
  | "cosmetic-surgeon"
  | "critical-care"
  | "dentist"
  | "dermatologist"
  | "endocrinologist"
  | "ent"
  | "eye"
  | "family-physician"
  | "gastroenterologist"
  | "gynecologist"
  | "liver"
  | "medical-specialist"
  | "nephrologist"
  | "neuro-physician"
  | "neuro-surgeon"
  | "nutritionist"
  | "orthopedics"
  | "physiotherapist"
  | "psychiatrist"
  | "pulmonologist"
  | "radiologist"
  | "rheumatologist"
  | "speech-pathologist"
  | "surgeon"
  | "urologist";

export interface TopSpecialty {
  id: string;
  label: string;
  icon: SpecialtyIconId;
  specialty?: Specialization;
  query?: string;
}

export const TOP_SPECIALTIES: TopSpecialty[] = [
  {
    id: "breast-oncologist",
    label: "Breast Oncologist",
    icon: "breast-oncologist",
    query: "breast oncologist",
  },
  {
    id: "child-specialist",
    label: "Child Specialist",
    icon: "child-specialist",
    specialty: "Pediatrician",
  },
  {
    id: "clinical-psychologist",
    label: "Clinical Psychologist",
    icon: "clinical-psychologist",
    specialty: "Psychologist",
  },
  {
    id: "clinical-sexologist",
    label: "Clinical Sexologist & fertility specialist",
    icon: "clinical-sexologist",
    query: "sexologist fertility",
  },
  {
    id: "cosmetic-surgeon",
    label: "Cosmetic Surgeon",
    icon: "cosmetic-surgeon",
    query: "cosmetic surgeon",
  },
  {
    id: "critical-care",
    label: "Critical Care Specialist",
    icon: "critical-care",
    query: "critical care",
  },
  { id: "dentist", label: "Dentist", icon: "dentist", specialty: "Dentist" },
  { id: "dermatologist", label: "Dermatologist", icon: "dermatologist", specialty: "Dermatologist" },
  {
    id: "endocrinologist",
    label: "Endocrinologist",
    icon: "endocrinologist",
    query: "endocrinologist",
  },
  { id: "ent", label: "ENT Specialist", icon: "ent", specialty: "ENT Specialist" },
  { id: "eye", label: "Eye Specialist", icon: "eye", query: "ophthalmologist eye" },
  {
    id: "family-physician",
    label: "Family Physician",
    icon: "family-physician",
    specialty: "General Physician",
  },
  {
    id: "gastroenterologist",
    label: "Gastroenterologist",
    icon: "gastroenterologist",
    query: "gastroenterologist",
  },
  { id: "gynecologist", label: "Gynecologist", icon: "gynecologist", specialty: "Gynecologist" },
  { id: "liver", label: "Liver Specialist", icon: "liver", query: "hepatologist liver" },
  {
    id: "medical-specialist",
    label: "Medical Specialist",
    icon: "medical-specialist",
    specialty: "General Physician",
  },
  { id: "nephrologist", label: "Nephrologist", icon: "nephrologist", query: "nephrologist" },
  {
    id: "neuro-physician",
    label: "Neuro-physician",
    icon: "neuro-physician",
    specialty: "Neurologist",
  },
  { id: "neuro-surgeon", label: "Neuro-Surgeon", icon: "neuro-surgeon", query: "neuro surgeon" },
  {
    id: "nutritionist",
    label: "Nutritionist / Dietician",
    icon: "nutritionist",
    specialty: "Nutritionist",
  },
  {
    id: "orthopedics",
    label: "Orthopedics",
    icon: "orthopedics",
    specialty: "Orthopedic Surgeon",
  },
  {
    id: "physiotherapist",
    label: "Physiotherapist",
    icon: "physiotherapist",
    query: "physiotherapist",
  },
  { id: "psychiatrist", label: "Psychiatrist", icon: "psychiatrist", specialty: "Psychiatrist" },
  { id: "pulmonologist", label: "Pulmonologist", icon: "pulmonologist", query: "pulmonologist" },
  { id: "radiologist", label: "Radiologist", icon: "radiologist", query: "radiologist" },
  { id: "rheumatologist", label: "Rheumatologist", icon: "rheumatologist", query: "rheumatologist" },
  {
    id: "speech-pathologist",
    label: "Speech and language pathologist",
    icon: "speech-pathologist",
    query: "speech language pathologist",
  },
  { id: "surgeon", label: "Surgeon", icon: "surgeon", query: "surgeon" },
  { id: "urologist", label: "Urologist", icon: "urologist", query: "urologist" },
];

export function specialtySearchHref(item: TopSpecialty): string {
  if (item.specialty) return buildDoctorSearchUrl({ specialty: item.specialty });
  if (item.query) return buildDoctorSearchUrl({ q: item.query });
  return buildDoctorSearchUrl({ q: item.label });
}
