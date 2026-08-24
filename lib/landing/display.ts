import type { AppointmentType } from "@/types";
import { formatCurrency } from "@/lib/doctor/mappers";
import { DAY_LABELS, formatSlotRange } from "@/lib/booking/slots";
import { ACCENT_CLASSES, isSectionVisible } from "./defaults";
import { CONSULT_TYPE_LABELS } from "./content";
import type {
  PublicAvailabilitySlot,
  PublicLandingPageData,
  PublicLandingService,
  LandingServiceCard,
} from "./types";

export function groupedAvailability(slots: PublicAvailabilitySlot[]) {
  return slots.reduce<Record<number, { start_time: string; end_time: string }[]>>(
    (acc, slot) => {
      const list = acc[slot.day_of_week] ?? [];
      list.push({ start_time: slot.start_time, end_time: slot.end_time });
      acc[slot.day_of_week] = list;
      return acc;
    },
    {},
  );
}

export function availabilitySummary(slots: PublicAvailabilitySlot[]): string {
  if (!slots.length) return "Flexible scheduling — pick a time when booking.";
  const days = [...new Set(slots.map((slot) => slot.day_of_week))].sort();
  const first = slots[0];
  const last = slots[slots.length - 1];
  const dayLabel =
    days.length === 7
      ? "Daily"
      : days.length >= 5 && days[0] === 1 && days[days.length - 1] === 5
        ? "Mon–Fri"
        : days.map((day) => DAY_LABELS[day].slice(0, 3)).join(", ");
  return `${dayLabel} · ${formatSlotRange(first.start_time, last.end_time)}`;
}

export function serviceFeeLabel(service: PublicLandingService): string {
  return formatCurrency(service.fee);
}

export function serviceTypeLabel(types: AppointmentType[]): string {
  return types.map((type) => CONSULT_TYPE_LABELS[type]).join(" · ");
}

export function presentServices(
  services: PublicLandingService[],
  cards: LandingServiceCard[],
): PublicLandingService[] {
  const byId = new Map(cards.map((card) => [card.serviceId, card]));
  return services.map((service) => {
    const overlay = byId.get(service.serviceId ?? service.id);
    if (!overlay) {
      return {
        ...service,
        imageUrl: service.imageUrl ?? null,
        benefits: service.benefits ?? [],
        featured: service.featured ?? false,
      };
    }
    return {
      ...service,
      name: overlay.displayName.trim() || service.name,
      description: overlay.shortDescription.trim() || service.description,
      imageUrl: overlay.imageUrl,
      benefits: overlay.benefits,
      featured: overlay.featured,
    };
  });
}

export function landingTheme(data: PublicLandingPageData) {
  return {
    ...ACCENT_CLASSES[data.content.accent],
    pill: data.content.buttonStyle === "pill" ? "rounded-full" : "rounded-xl",
  };
}

export { isSectionVisible, formatSlotRange, DAY_LABELS, CONSULT_TYPE_LABELS };
