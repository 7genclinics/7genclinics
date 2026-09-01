import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Building2, MapPin, MessageCircle, Star, Video } from "lucide-react";
import { mapToDoctorCard } from "@/lib/patient/mappers";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/doctor/mappers";

type DoctorCardData = ReturnType<typeof mapToDoctorCard>;

function StarRating({ rating, count }: { rating: number; count: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              "h-3.5 w-3.5",
              index < filled ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
            )}
          />
        ))}
      </div>
      {count > 0 && <span className="text-xs text-slate-500">({count})</span>}
    </div>
  );
}

interface DoctorCatalogCardProps {
  doctor: DoctorCardData;
}

export function DoctorCatalogCard({ doctor }: DoctorCatalogCardProps) {
  const isDataUrl = doctor.avatarUrl?.startsWith("data:");
  const specialtyTags = doctor.taxonomyTags.slice(0, 3);

  return (
    <Link
      href={doctor.publicHref}
      className="group flex h-full flex-col rounded-2xl border border-brand-900/8 bg-[#f6fbfb] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:bg-white hover:shadow-[0_18px_36px_-22px_rgba(15,20,42,0.35)] sm:p-7"
    >
      <div className="flex gap-4 sm:gap-5">
        <div className="relative shrink-0">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-brand-700 ring-1 ring-brand-900/10 sm:h-16 sm:w-16">
            {doctor.avatarUrl ? (
              isDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doctor.avatarUrl}
                  alt={doctor.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={doctor.avatarUrl}
                  alt={doctor.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              )
            ) : (
              <span className="flex h-full w-full items-center justify-center text-base font-bold text-white sm:text-lg">
                {getInitials(doctor.name)}
              </span>
            )}
          </div>
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
              doctor.isAvailableToday ? "bg-emerald-500" : "bg-slate-300"
            )}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3 className="font-heading text-base font-bold leading-snug text-brand-900 transition-colors group-hover:text-brand-600 sm:text-[17px]">
              {doctor.name}
            </h3>
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          </div>
          <p className="mt-1.5 text-sm font-medium leading-snug text-brand-600">
            {doctor.specialization}
          </p>
          {doctor.subSpecialization ? (
            <p className="mt-0.5 text-xs text-slate-500">{doctor.subSpecialization}</p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">
            {doctor.experienceYears} years experience
          </p>
        </div>
      </div>

      {specialtyTags.length > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-slate-500 line-clamp-2">
          {specialtyTags.join(" · ")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {doctor.offersOnline && (
          <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            <Video className="h-3 w-3" />
            Online
          </span>
        )}
        {doctor.offersPhysical && (
          <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            <Building2 className="h-3 w-3" />
            Physical
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          <MessageCircle className="h-3 w-3" />
          Chat
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-brand-500" />
          {doctor.city}
        </span>
        <span
          className={cn(
            "font-medium",
            doctor.isAvailableToday ? "text-emerald-600" : "text-slate-400"
          )}
        >
          {doctor.isAvailableToday ? "Available today" : "Check schedule"}
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 border-t border-brand-900/10 pt-5">
        <StarRating rating={doctor.rating} count={doctor.reviewsCount} />
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Consultation fee
          </p>
          <p className="mt-0.5 font-heading text-lg font-bold text-brand-900">
            {doctor.consultationFee}
          </p>
        </div>
      </div>
    </Link>
  );
}
