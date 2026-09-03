"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/brand/BrandMark";
import { MAIN_LANDING_NAV } from "@/lib/brand/main-nav";
import { cn } from "@/lib/utils";

type LandingHeaderProps = {
  overlay?: boolean;
};

export function LandingHeader({ overlay = false }: LandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const inverted = overlay && !scrolled && !mobileOpen;

  return (
    <header
      className={cn(
        "z-50 transition-[background-color,border-color,box-shadow] duration-300",
        overlay ? "fixed inset-x-0 top-0" : "sticky top-0",
        inverted
          ? "border-b border-transparent bg-transparent"
          : "border-b border-brand-900/8 bg-white/95 shadow-[0_1px_0_rgba(18,53,58,0.04)] backdrop-blur-md"
      )}
    >
      <div className="relative mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandMark size="md" inverted={inverted} />

        <nav className="hidden items-center gap-9 md:flex">
          {MAIN_LANDING_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-[13px] font-medium tracking-wide transition-colors",
                inverted
                  ? "text-white/80 hover:text-white"
                  : "text-brand-900/80 hover:text-brand-500"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login/">
            <Button
              variant="ghost"
              className={cn(
                "font-medium",
                inverted ? "text-white hover:bg-white/10 hover:text-white" : "text-brand-900"
              )}
            >
              Login
            </Button>
          </Link>
          <Link href="/doctors/">
            <Button
              className={cn(
                "font-medium",
                inverted
                  ? "bg-white text-brand-900 hover:bg-white/90"
                  : "bg-brand-500 text-white hover:bg-brand-600"
              )}
            >
              Find a doctor
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className={cn(
            "relative z-50 rounded-md p-2 md:hidden",
            inverted ? "text-white" : "text-brand-900"
          )}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-brand-950/50 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          aria-label="Close menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={() => setMobileOpen(false)}
        />

        <div
          className={cn(
            "absolute inset-x-0 top-[4.25rem] max-h-[calc(100dvh-4.25rem)] overflow-y-auto border-b border-brand-100 bg-white transition-all duration-200",
            mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          )}
        >
          <nav className="flex flex-col px-4 py-4">
            {MAIN_LANDING_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-heading px-2 py-3 text-xl font-semibold text-brand-900"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-brand-100 pt-4 pb-2">
              <Link href="/login/" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full">
                  Login
                </Button>
              </Link>
              <Link href="/doctors/" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-brand-500 text-white hover:bg-brand-600">
                  Find a doctor
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
