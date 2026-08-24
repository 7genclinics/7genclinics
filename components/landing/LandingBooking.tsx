"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookingModal } from "@/components/public/BookingModal";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/doctor/mappers";
import type { AppointmentType, UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface LandingBookingDoctor {
  id: string;
  slug: string;
  name: string;
  consultationFee: number;
}

interface LandingBookingContextValue {
  book: (type?: AppointmentType, serviceId?: string | null) => void;
  pill: string;
  buttonClass: string;
}

const LandingBookingContext = createContext<LandingBookingContextValue | null>(null);

export function useLandingBook() {
  const ctx = useContext(LandingBookingContext);
  if (!ctx) {
    return {
      book: () => undefined,
      pill: "rounded-xl",
      buttonClass: "bg-brand-500 hover:bg-brand-600 text-white",
    };
  }
  return ctx;
}

interface LandingBookingRootProps {
  doctor: LandingBookingDoctor;
  allowedTypes: AppointmentType[];
  buttonClass: string;
  pill: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function LandingBookingRoot({
  doctor,
  allowedTypes,
  buttonClass,
  pill,
  disabled = false,
  children,
}: LandingBookingRootProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [bookType, setBookType] = useState<AppointmentType>(allowedTypes[0] ?? "in_person");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isPatient, setIsPatient] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setIsPatient(false);
        setAuthChecked(true);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setIsPatient((profile as { role: UserRole } | null)?.role === "patient");
      setAuthChecked(true);
    });
  }, []);

  const book = useCallback(
    (type?: AppointmentType, nextServiceId?: string | null) => {
      if (disabled || !authChecked) return;
      const chosen =
        type && allowedTypes.includes(type) ? type : (allowedTypes[0] ?? "in_person");
      setBookType(chosen);
      setServiceId(nextServiceId ?? null);

      if (!isPatient) {
        const redirect = `/doctors/${doctor.slug}?book=true&type=${chosen}`;
        router.push(`/login?redirect=${encodeURIComponent(redirect)}&role=patient`);
        return;
      }
      setOpen(true);
    },
    [allowedTypes, authChecked, disabled, doctor.slug, isPatient, router],
  );

  useEffect(() => {
    if (searchParams.get("book") === "true" && authChecked && isPatient && !disabled) {
      const typeParam = searchParams.get("type") as AppointmentType | null;
      if (typeParam && allowedTypes.includes(typeParam)) setBookType(typeParam);
      setOpen(true);
    }
  }, [searchParams, authChecked, isPatient, disabled, allowedTypes]);

  const value = useMemo(
    () => ({ book, pill, buttonClass }),
    [book, pill, buttonClass],
  );

  return (
    <LandingBookingContext.Provider value={value}>
      {children}
      {open && isPatient && (
        <BookingModal
          doctor={{
            id: doctor.id,
            name: doctor.name,
            consultationFee: formatCurrency(doctor.consultationFee),
            consultationFeeRaw: doctor.consultationFee,
          }}
          initialType={bookType}
          allowedTypes={allowedTypes}
          serviceId={serviceId}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            router.push("/patient/appointments");
          }}
        />
      )}
    </LandingBookingContext.Provider>
  );
}

interface BookButtonProps {
  type?: AppointmentType;
  serviceId?: string | null;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
}

export function BookButton({
  type,
  serviceId,
  children,
  className,
  variant = "primary",
}: BookButtonProps) {
  const { book, pill, buttonClass } = useLandingBook();
  return (
    <button
      type="button"
      onClick={() => book(type, serviceId)}
      className={cn(
        "inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold transition-colors",
        pill,
        variant === "primary" && buttonClass,
        variant === "secondary" &&
          "border border-white/30 bg-white/10 text-white hover:bg-white/20",
        variant === "ghost" && "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
        variant === "outline" &&
          "border border-brand-900/15 bg-white text-brand-900 hover:bg-brand-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
