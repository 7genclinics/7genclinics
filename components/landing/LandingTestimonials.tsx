"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { PublicLandingReview } from "@/lib/landing/types";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-[#e8f0fe] text-[#1a73e8]",
  "bg-[#fce8e6] text-[#d93025]",
  "bg-[#e6f4ea] text-[#188038]",
  "bg-[#fef7e0] text-[#f9ab00]",
  "bg-[#f3e8fd] text-[#9334e6]",
  "bg-[#e8f5e9] text-[#137333]",
];

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.max(0, Math.floor((Date.now() - then) / 86400000));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function ReviewTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() =>
    new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
  );

  useEffect(() => {
    setLabel(timeAgo(iso));
  }, [iso]);

  return <p className="text-xs text-slate-500">{label}</p>;
}

function GoogleStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "h-3.5 w-3.5",
            index < Math.round(rating)
              ? "fill-[#fbbc04] text-[#fbbc04]"
              : "fill-slate-200 text-slate-200",
          )}
        />
      ))}
    </span>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LandingTestimonials({
  reviews,
  rating,
  total,
  doctorName,
}: {
  reviews: PublicLandingReview[];
  rating: number;
  total: number;
  doctorName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [perView, setPerView] = useState(3);
  const [paused, setPaused] = useState(false);
  const pageCount = Math.max(1, reviews.length - perView + 1);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setPerView(1);
      else if (window.innerWidth < 1024) setPerView(2);
      else setPerView(3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      setActiveIndex(((next % pageCount) + pageCount) % pageCount);
    },
    [pageCount],
  );

  useEffect(() => {
    if (paused || pageCount <= 1 || reviews.length === 0) return;
    const timer = setInterval(() => goTo(activeIndex + 1), 4500);
    return () => clearInterval(timer);
  }, [activeIndex, goTo, pageCount, paused, reviews.length]);

  useEffect(() => {
    if (activeIndex > pageCount - 1) setActiveIndex(0);
  }, [activeIndex, pageCount]);

  if (reviews.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]">
          <Star className="h-6 w-6 fill-current" />
        </div>
        <p className="mt-4 font-heading text-lg font-semibold text-brand-900">No reviews yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Verified Google-style reviews from patients who completed a visit with {doctorName} will
          appear here after moderation.
        </p>
      </div>
    );
  }

  return (
    <div
      className="mt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-8 flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-center sm:text-left">
          <p className="font-heading text-3xl font-bold text-brand-900">
            {rating > 0 ? rating.toFixed(1) : "—"}
          </p>
          <div className="mt-1 flex justify-center sm:justify-start">
            <GoogleStars rating={rating || 5} />
          </div>
        </div>
        <div className="hidden h-10 w-px bg-slate-200 sm:block" />
        <div className="text-center text-sm text-slate-600 sm:text-left">
          <p className="font-semibold text-brand-900">Patient reviews</p>
          <p>
            Based on {total || reviews.length} verified review
            {(total || reviews.length) === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${activeIndex * (100 / perView)}%)` }}
          >
            {reviews.map((review, index) => (
              <div
                key={review.id}
                className="shrink-0 px-2 sm:px-3"
                style={{ width: `${100 / perView}%` }}
              >
                <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        AVATAR_COLORS[index % AVATAR_COLORS.length],
                      )}
                    >
                      {review.displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {review.displayName}
                          </p>
                          <ReviewTime iso={review.createdAt} />
                        </div>
                        <GoogleMark />
                      </div>
                      <div className="mt-1.5">
                        <GoogleStars rating={review.rating} />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">
                    {review.comment}
                  </p>
                </article>
              </div>
            ))}
          </div>
        </div>

        {pageCount > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Previous reviews"
              onClick={() => goTo(activeIndex - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-brand-200 hover:text-brand-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to review group ${index + 1}`}
                  onClick={() => goTo(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === activeIndex ? "w-6 bg-brand-500" : "w-2 bg-slate-300 hover:bg-slate-400",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next reviews"
              onClick={() => goTo(activeIndex + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-brand-200 hover:text-brand-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
