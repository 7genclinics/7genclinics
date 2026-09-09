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
  tagline?: string;
  keywords?: string[];
  bgTint?: string;
}

export const TOP_SPECIALTIES: TopSpecialty[] = [
  {
    id: "breast-oncologist",
    label: "Breast Oncologist",
    icon: "breast-oncologist",
    query: "breast oncologist",
    tagline: "Expert care for breast health",
    keywords: ["breast", "cancer", "oncology", "tumor", "lump", "screening", "chemo"],
    bgTint: "bg-rose-50 text-rose-500 border-rose-100",
  },
  {
    id: "child-specialist",
    label: "Child Specialist",
    icon: "child-specialist",
    specialty: "Pediatrician",
    tagline: "Complete care for your child",
    keywords: ["child", "pediatric", "baby", "infant", "child fever", "kids", "vaccination", "growth", "fever"],
    bgTint: "bg-cyan-50 text-cyan-600 border-cyan-100",
  },
  {
    id: "clinical-psychologist",
    label: "Clinical Psychologist",
    icon: "clinical-psychologist",
    specialty: "Psychologist",
    tagline: "Support for a healthier mind",
    keywords: ["anxiety", "depression", "mental health", "therapy", "counseling", "stress", "panic", "mood", "adhd"],
    bgTint: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    id: "clinical-sexologist",
    label: "Clinical Sexologist & Fertility Specialist",
    icon: "clinical-sexologist",
    query: "sexologist fertility",
    tagline: "Guidance for reproductive health",
    keywords: ["fertility", "sexologist", "reproductive", "infertility", "pregnancy", "sexual health", "hormones"],
    bgTint: "bg-orange-50 text-orange-600 border-orange-100",
  },
  {
    id: "cosmetic-surgeon",
    label: "Cosmetic Surgeon",
    icon: "cosmetic-surgeon",
    query: "cosmetic surgeon",
    tagline: "Enhance your natural beauty",
    keywords: ["cosmetic", "plastic surgery", "rhinoplasty", "aesthetic", "skin repair", "botox", "beauty"],
    bgTint: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    id: "dentist",
    label: "Dentist",
    icon: "dentist",
    specialty: "Dentist",
    tagline: "Healthy smiles for life",
    keywords: ["tooth", "teeth", "dentist", "toothache", "cavity", "root canal", "braces", "gums", "dental"],
    bgTint: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: "critical-care",
    label: "Cardiologist",
    icon: "critical-care",
    query: "cardiologist heart",
    tagline: "For a healthier heart",
    keywords: ["heart", "cardio", "chest pain", "blood pressure", "hypertension", "palpitations", "ecg", "cardiac"],
    bgTint: "bg-rose-50 text-rose-500 border-rose-100",
  },
  {
    id: "gastroenterologist",
    label: "Gastroenterologist",
    icon: "gastroenterologist",
    query: "gastroenterologist",
    tagline: "Better digestive health",
    keywords: ["stomach", "digestion", "stomach pain", "acid", "gerd", "liver", "gastric", "ulcer", "vomiting", "constipation", "gut"],
    bgTint: "bg-teal-50 text-teal-600 border-teal-100",
  },
  {
    id: "dermatologist",
    label: "Dermatologist",
    icon: "dermatologist",
    specialty: "Dermatologist",
    tagline: "Care for your skin, hair & nails",
    keywords: ["skin", "skin allergy", "hair", "nails", "acne", "rash", "eczema", "allergy", "pigmentation", "dermatology", "itching"],
    bgTint: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    id: "orthopedics",
    label: "Orthopedic Surgeon",
    icon: "orthopedics",
    specialty: "Orthopedic Surgeon",
    tagline: "Stronger bones, active life",
    keywords: ["bone", "joint", "back pain", "knee pain", "fracture", "arthritis", "spine", "ortho", "shoulder pain"],
    bgTint: "bg-sky-50 text-sky-600 border-sky-100",
  },
  {
    id: "ent",
    label: "ENT Specialist",
    icon: "ent",
    specialty: "ENT Specialist",
    tagline: "Care for ear, nose & throat",
    keywords: ["ear", "nose", "throat", "sinus", "hearing", "tonsils", "sore throat", "cough", "ent", "dizziness"],
    bgTint: "bg-violet-50 text-violet-600 border-violet-100",
  },
  {
    id: "pulmonologist",
    label: "Pulmonologist",
    icon: "pulmonologist",
    query: "pulmonologist",
    tagline: "Healthier breathing for a better life",
    keywords: ["lungs", "breathing", "asthma", "cough", "respiratory", "shortness of breath", "chest", "flu", "fever"],
    bgTint: "bg-rose-50 text-rose-500 border-rose-100",
  },
  {
    id: "family-physician",
    label: "General Physician",
    icon: "family-physician",
    specialty: "General Physician",
    tagline: "Everyday health, fever & checkups",
    keywords: ["fever", "cough", "cold", "flu", "weakness", "infection", "headache", "checkup", "general", "body pain"],
    bgTint: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: "psychiatrist",
    label: "Psychiatrist",
    icon: "psychiatrist",
    specialty: "Psychiatrist",
    tagline: "Medical care for emotional wellness",
    keywords: ["depression", "anxiety", "insomnia", "bipolar", "mental health", "medication", "panic", "psychiatry", "sleep"],
    bgTint: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  {
    id: "gynecologist",
    label: "Gynecologist",
    icon: "gynecologist",
    specialty: "Gynecologist",
    tagline: "Comprehensive women's healthcare",
    keywords: ["women", "pregnancy", "period", "pcos", "maternity", "gynae", "female health", "delivery"],
    bgTint: "bg-pink-50 text-pink-600 border-pink-100",
  },
  {
    id: "neuro-physician",
    label: "Neurologist",
    icon: "neuro-physician",
    specialty: "Neurologist",
    tagline: "Brain and nervous system care",
    keywords: ["brain", "nerve", "headache", "migraine", "seizure", "stroke", "paralysis", "neuro", "memory"],
    bgTint: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
  },
  {
    id: "nutritionist",
    label: "Nutritionist / Dietician",
    icon: "nutritionist",
    specialty: "Nutritionist",
    tagline: "Healthy diets & lifestyle plans",
    keywords: ["diet", "weight loss", "nutrition", "diabetes diet", "calories", "healthy eating", "weight gain"],
    bgTint: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    id: "eye",
    label: "Eye Specialist",
    icon: "eye",
    query: "ophthalmologist eye",
    tagline: "Clear vision and eye care",
    keywords: ["eye", "vision", "glasses", "cataract", "blurry", "lasik", "ophthalmology", "red eye"],
    bgTint: "bg-cyan-50 text-cyan-600 border-cyan-100",
  },
  {
    id: "endocrinologist",
    label: "Endocrinologist",
    icon: "endocrinologist",
    query: "endocrinologist",
    tagline: "Hormone & diabetes management",
    keywords: ["diabetes", "thyroid", "hormones", "sugar", "insulin", "weight", "endocrine"],
    bgTint: "bg-yellow-50 text-yellow-600 border-yellow-100",
  },
  {
    id: "urologist",
    label: "Urologist",
    icon: "urologist",
    query: "urologist",
    tagline: "Kidney, bladder & urinary tract care",
    keywords: ["urinary", "kidney stone", "bladder", "prostate", "urine infection", "uro"],
    bgTint: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: "physiotherapist",
    label: "Physiotherapist",
    icon: "physiotherapist",
    query: "physiotherapist",
    tagline: "Physical rehabilitation & pain relief",
    keywords: ["physiotherapy", "muscle pain", "rehab", "back pain", "shoulder pain", "injury", "exercise"],
    bgTint: "bg-teal-50 text-teal-600 border-teal-100",
  },
  {
    id: "liver",
    label: "Liver Specialist",
    icon: "liver",
    query: "hepatologist liver",
    tagline: "Specialized hepatitis & liver care",
    keywords: ["liver", "hepatitis", "jaundice", "fatty liver", "cirrhosis", "hepatologist"],
    bgTint: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    id: "nephrologist",
    label: "Nephrologist",
    icon: "nephrologist",
    query: "nephrologist",
    tagline: "Kidney disease & dialysis management",
    keywords: ["kidney", "dialysis", "renal", "creatinine", "nephrology"],
    bgTint: "bg-sky-50 text-sky-600 border-sky-100",
  },
  {
    id: "rheumatologist",
    label: "Rheumatologist",
    icon: "rheumatologist",
    query: "rheumatologist",
    tagline: "Autoimmune & joint disorder relief",
    keywords: ["arthritis", "joint pain", "lupus", "rheumatoid", "uric acid", "gout"],
    bgTint: "bg-purple-50 text-purple-600 border-purple-100",
  },
];

export function specialtySearchHref(item: TopSpecialty): string {
  if (item.specialty) return buildDoctorSearchUrl({ specialty: item.specialty });
  if (item.query) return buildDoctorSearchUrl({ q: item.query });
  return buildDoctorSearchUrl({ q: item.label });
}
