"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LandingBeforeAfterItem } from "@/lib/landing/types";
import { cn } from "@/lib/utils";
import { BookButton } from "./LandingBooking";

export function BeforeAfterSlider({ items }: { items: LandingBeforeAfterItem[] }) {
  const pairs = useMemo(
    () => items.filter((item) => item.beforeUrl && item.afterUrl),
    [items],
  );
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(3);

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

  if (!pairs.length) return null;

  const maxIndex = Math.max(0, pairs.length - perView);
  const page = Math.min(index, maxIndex);

  return (
    <div>
      <div className="mb-10 flex items-center justify-center gap-4">
        <span className="hidden h-px w-16 bg-brand-900/15 sm:block" />
        <h2 className="text-center text-sm font-bold uppercase tracking-[0.22em] text-brand-900 sm:text-base">
          Before &amp; After Results
        </h2>
        <span className="hidden h-px w-16 bg-brand-900/15 sm:block" />
      </div>

      <div className="relative">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${page * (100 / perView)}%)` }}
          >
            {pairs.map((item) => (
              <article
                key={item.id}
                className="shrink-0 px-2 sm:px-3"
                style={{ width: `${100 / perView}%` }}
              >
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="mb-4 text-center text-base font-bold text-brand-900">
                    {item.title || "Treatment result"}
                  </h3>
                  <CompareFrame beforeUrl={item.beforeUrl} afterUrl={item.afterUrl} />
                  <div className="mt-2 grid grid-cols-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Before</span>
                    <span>After</span>
                  </div>
                  {item.caption && (
                    <p className="mt-3 text-center text-sm text-slate-600">{item.caption}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        {pairs.length > perView && (
          <>
            <button
              type="button"
              aria-label="Previous results"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className="absolute left-0 top-[42%] z-10 flex h-10 w-10 -translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-brand-900/10 bg-white text-brand-900 shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next results"
              onClick={() => setIndex((value) => Math.min(maxIndex, value + 1))}
              className="absolute right-0 top-[42%] z-10 flex h-10 w-10 translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-brand-900/10 bg-white text-brand-900 shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="mt-10 flex justify-center">
        <BookButton className="h-12 rounded-full bg-brand-800 px-8 hover:bg-brand-900">
          View More Transformations
          <ChevronRight className="ml-1 h-4 w-4" />
        </BookButton>
      </div>
    </div>
  );
}

function CompareFrame({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(92, Math.max(8, next)));
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      updateFromClientX(event.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateFromClientX]);

  return (
    <div
      ref={ref}
      className="relative aspect-[5/4] touch-none overflow-hidden rounded-xl bg-slate-100 select-none"
      onPointerDown={(event) => {
        dragging.current = true;
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        updateFromClientX(event.clientX);
      }}
    >
      <Image src={afterUrl} alt="After" fill className="object-cover" sizes="360px" unoptimized />
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image src={beforeUrl} alt="Before" fill className="object-cover" sizes="360px" unoptimized />
      </div>
      <div
        className="absolute inset-y-0 z-10 w-0.5 bg-white shadow"
        style={{ left: `${position}%` }}
      >
        <span
          className={cn(
            "absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center",
            "rounded-full border border-slate-200 bg-white text-brand-800 shadow-md",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
