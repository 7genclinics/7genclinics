import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Star,
  Stethoscope,
  Video,
} from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { mapToDoctorCard } from "@/lib/patient/mappers";

type DoctorCardData = ReturnType<typeof mapToDoctorCard>;

interface DoctorListCardProps {
  doctor: DoctorCardData;
  rank?: number;
  onBookVideo?: () => void;
  onBookAppointment?: () => void;
}

export function DoctorListCard({
  doctor,
  onBookVideo,
  onBookAppointment,
}: DoctorListCardProps) {
  const tags = doctor.taxonomyTags.slice(0, 4);

  return (
    <article className="overflow-hidden rounded-2xl border border-brand-900/8 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <UserAvatar
            name={doctor.name}
            avatarUrl={doctor.avatarUrl}
            size="lg"
            className="h-20 w-20 text-xl"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={doctor.publicHref}
                className="font-heading text-lg font-semibold tracking-tight text-brand-900 hover:text-brand-600"
              >
                {doctor.name}
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-900/8 bg-[#f7fbfb] px-2 py-0.5 text-[11px] font-semibold text-brand-800">
                <BadgeCheck className="h-3 w-3 text-brand-500" />
                PMDC verified
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-brand-600">{doctor.specialization}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{doctor.qualification}</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              {doctor.rating > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {doctor.rating.toFixed(1)}
                  <span className="font-medium text-slate-400">({doctor.reviewsCount})</span>
                </span>
              )}
              <span>{doctor.experience}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-brand-500" />
                {doctor.city}
              </span>
            </div>

            {tags.length > 0 && (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{tags.join(" · ")}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {doctor.offersOnline && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  <Video className="h-3 w-3" />
                  Online
                </span>
              )}
              {doctor.offersPhysical && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  <Stethoscope className="h-3 w-3" />
                  Physical
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:w-[200px] lg:flex-col">
          <button
            type="button"
            onClick={onBookAppointment}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Stethoscope className="h-4 w-4" />
            Book visit
          </button>
          <button
            type="button"
            onClick={onBookVideo}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-brand-900/10 bg-white px-4 text-sm font-semibold text-brand-900 transition-colors hover:bg-[#f7fbfb]"
          >
            <Video className="h-4 w-4" />
            Book video
          </button>
          <Link
            href={doctor.publicHref}
            className="inline-flex h-11 items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-px border-t border-brand-900/8 bg-brand-900/8 sm:grid-cols-2">
        <div className="flex items-center justify-between bg-[#f7fbfb] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
              Physical visit
            </p>
            <p className="mt-1 font-heading text-lg font-bold tracking-tight text-brand-900">
              {doctor.consultationFee}
            </p>
          </div>
          <span className="text-xs text-slate-500">{doctor.city}</span>
        </div>
        <div className="flex items-center justify-between bg-[#f7fbfb] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
              Video consult
            </p>
            <p className="mt-1 font-heading text-lg font-bold tracking-tight text-brand-900">
              {doctor.consultationFee}
            </p>
          </div>
          <span className="text-xs font-medium text-brand-700">
            {doctor.isAvailableToday ? "Open today" : "Check hours"}
          </span>
        </div>
      </div>
    </article>
  );
}

export function DoctorGridCard({
  doctor,
  onBook,
}: {
  doctor: DoctorCardData;
  onBook?: () => void;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-brand-900/8 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="p-6">
        <div className="flex items-start gap-3">
          <UserAvatar
            name={doctor.name}
            avatarUrl={doctor.avatarUrl}
            size="md"
            className="h-14 w-14"
          />
          <div className="min-w-0">
            <Link
              href={doctor.publicHref}
              className="font-heading text-lg font-semibold tracking-tight text-brand-900 hover:text-brand-600"
            >
              {doctor.name}
            </Link>
            <p className="text-xs font-medium text-brand-600">{doctor.specialization}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              {doctor.rating > 0 && (
                <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {doctor.rating.toFixed(1)}
                </span>
              )}
              <span>{doctor.experience}</span>
            </div>
          </div>
        </div>
        <p className="mt-5 font-heading text-lg font-bold tracking-tight text-brand-900">
          {doctor.consultationFee}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{doctor.city}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {doctor.offersOnline && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
              Online
            </span>
          )}
          {doctor.offersPhysical && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
              Physical
            </span>
          )}
        </div>
      </div>
      <div className="mt-auto flex gap-2 border-t border-brand-900/8 bg-[#f7fbfb] p-4">
        <Link
          href={doctor.publicHref}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-brand-900/10 bg-white text-xs font-semibold text-brand-900 hover:bg-white"
        >
          View profile
        </Link>
        {onBook && (
          <button
            type="button"
            onClick={onBook}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Book slot
          </button>
        )}
      </div>
    </article>
  );
}
