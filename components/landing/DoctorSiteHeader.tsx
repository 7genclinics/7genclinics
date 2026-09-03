"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { MAIN_LANDING_NAV } from "@/lib/brand/main-nav";
import type { PublicLandingPageData } from "@/lib/landing/types";
import { cn } from "@/lib/utils";
import { BookButton } from "./LandingBooking";
import { DoctorTopBar } from "./DoctorTopBar";

export function DoctorSiteHeader({
  data,
  preview = false,
}: {
  data: PublicLandingPageData;
  preview?: boolean;
}) {
  const { content } = data;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      className={cn(
        "relative sticky top-0 z-50 bg-white/95 backdrop-blur-md transition-shadow",
        scrolled
          ? "border-b border-brand-900/8 shadow-[0_8px_30px_rgba(15,20,42,0.06)]"
          : "border-b border-transparent",
        preview && "relative",
      )}
    >
      <DoctorTopBar content={content} />
      <div className="mx-auto flex h-[4.4rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandMark href="/" size="md" />

        <nav className="hidden items-center gap-6 lg:flex">
          {MAIN_LANDING_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-brand-900/75 transition-colors hover:text-brand-500"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <BookButton className="h-11 rounded-full bg-brand-800 px-5 hover:bg-brand-900">
            <CalendarDays className="mr-2 h-4 w-4" />
            {content.ctaPrimaryText}
          </BookButton>
        </div>

        <button
          type="button"
          className="relative z-[60] rounded-md p-2 text-brand-900 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 top-full z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "fixed inset-0 -z-10 bg-brand-950/50 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "max-h-[min(70dvh,28rem)] overflow-y-auto border-b border-brand-900/8 bg-white shadow-[0_16px_40px_rgba(15,20,42,0.12)] transition-all duration-200",
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
          )}
        >
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-4 sm:px-6">
            {MAIN_LANDING_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-heading px-1 py-3 text-lg font-semibold text-brand-900"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 pb-1" onClick={() => setOpen(false)}>
              <BookButton className="h-11 w-full rounded-full bg-brand-800 hover:bg-brand-900">
                <CalendarDays className="mr-2 h-4 w-4" />
                {content.ctaPrimaryText}
              </BookButton>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
