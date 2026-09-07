import type { AppLocale } from "./types";

export function intlLocale(locale: AppLocale): string {
  return locale === "ur" ? "ur-PK" : "en-PK";
}

export function formatLocalizedTime(value: string | Date, locale: AppLocale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  });
}

export function formatLocalizedTimeRange(
  scheduledAt: string,
  durationMinutes: number,
  locale: AppLocale,
): string {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${formatLocalizedTime(start, locale)} – ${formatLocalizedTime(end, locale)}`;
}

export function formatLocalizedDate(
  value: string | Date,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(
    intlLocale(locale),
    options ?? { year: "numeric", month: "short", day: "numeric" },
  );
}

export function formatLocalizedCurrency(amount: number, locale: AppLocale): string {
  const value = Math.round(amount).toLocaleString(intlLocale(locale));
  return locale === "ur" ? `روپے ${value}` : `PKR ${value}`;
}

export function formatDoctorDisplayName(name: string, locale: AppLocale): string {
  if (locale !== "ur") return name;
  return name.replace(/^(Dr\.?|DR\.?|dr\.?)\s+/u, "ڈاکٹر ");
}

const SPECIALTY_UR: Record<string, string> = {
  dermatologist: "ماہر امراض جلد",
  cardiologist: "ماہر امراض قلب",
  gynecologist: "ماہر امراض زنان",
  "gynaecologist": "ماہر امراض زنان",
  obstetrician: "ماہر زچگی",
  pediatrician: "ماہر اطفال",
  paediatrician: "ماہر اطفال",
  orthopedic: "ماہر ہڈی و جوڑ",
  orthopedics: "ماہر ہڈی و جوڑ",
  "orthopaedic surgeon": "ماہر ہڈی و جوڑ",
  "general physician": "جنرل فزیشن",
  "general practitioner": "جنرل فزیشن",
  physician: "طبیب",
  specialist: "ماہر",
  ent: "ماہر ناک کان گلے",
  "ent specialist": "ماہر ناک کان گلے",
  psychiatrist: "ماہر نفسیات",
  psychologist: "ماہر نفسیات",
  neurologist: "ماہر اعصاب",
  dentist: "ماہر دانت",
  ophthalmologist: "ماہر چشم",
  pulmonologist: "ماہر پھیپھڑے",
  gastroenterologist: "ماہر نظام ہضم",
  urologist: "ماہر نظام پیشاب",
  oncologist: "ماہر سرطان",
  endocrinologist: "ماہر غدود",
  nephrologist: "ماہر گردہ",
  "general surgeon": "جنرل سرجن",
  surgeon: "جراح",
  "family medicine": "خاندانی طب",
  "internal medicine": "اندرونی امراض",
};

export function translateSpecialty(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return locale === "ur" ? "ماہر" : "Specialist";
  if (locale !== "ur") return value;
  const mapped = SPECIALTY_UR[value.trim().toLowerCase()];
  return mapped ?? value;
}

const STATUS_KEYS: Record<string, string> = {
  Confirmed: "status.confirmed",
  Pending: "status.pending",
  Completed: "status.completed",
  Cancelled: "status.cancelled",
  "No Show": "status.noShow",
  "Expired / No Show": "status.expiredNoShow",
  Ready: "status.ready",
  "Starting Soon": "status.startingSoon",
  Expired: "status.expired",
  "Awaiting Payment": "status.awaitingPayment",
  "Payment Review": "status.paymentReview",
};

export function statusMessageKey(status: string): string {
  return STATUS_KEYS[status] ?? status;
}

const TYPE_KEYS: Record<string, string> = {
  Video: "aptType.video",
  video: "aptType.video",
  Chat: "aptType.chat",
  chat: "aptType.chat",
  "In-Person": "aptType.inPerson",
  in_person: "aptType.inPerson",
  Audio: "aptType.chat",
  Consultation: "aptType.consultation",
};

export function typeMessageKey(type: string): string {
  return TYPE_KEYS[type] ?? "aptType.consultation";
}

export function formatRelativeDay(
  date: string,
  locale: AppLocale,
  t: (key: string) => string,
): string {
  const value = new Date(date);
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(value, today)) return t("common.today");
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(value, tomorrow)) return t("common.tomorrow");
  return formatLocalizedDate(date, locale, { month: "short", day: "numeric" });
}

export function formatTimeAgo(
  date: string,
  _locale: AppLocale,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t("timeAgo.justNow");
  if (minutes < 60) return t("timeAgo.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("timeAgo.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("timeAgo.daysAgo", { count: days });
}

export function formatDurationMinutes(
  minutes: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  return t("common.minutes", { count: minutes });
}

const ROLE_KEYS: Record<string, string> = {
  patient: "roles.patient",
  doctor: "roles.doctor",
  admin: "roles.admin",
  super_admin: "roles.superAdmin",
  receptionist: "roles.receptionist",
};

export function roleMessageKey(role: string): string {
  return ROLE_KEYS[role] ?? role;
}
