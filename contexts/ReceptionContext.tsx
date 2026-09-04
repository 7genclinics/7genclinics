"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { getReceptionContext } from "@/lib/clinic/api";
import type { Profile } from "@/types";
import {
  FULL_RECEPTION_PERMISSIONS,
  type ReceptionPermissions,
} from "@/lib/doctor/reception-permissions";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";

interface ReceptionContextValue {
  profile: Profile;
  permissions: ReceptionPermissions;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ReceptionContext = createContext<ReceptionContextValue | null>(null);

export function ReceptionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<ReceptionPermissions>(FULL_RECEPTION_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const refresh = useCallback(async () => {
    const keepExisting = Boolean(profileRef.current);
    if (!keepExisting) setIsLoading(true);
    setError(null);
    try {
      const result = await getReceptionContext();
      if (!result.ok) {
        setError(result.message);
        if (!keepExisting) setProfile(null);
        return;
      }
      setProfile(result.data.profile);
      setPermissions(result.data.permissions);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load reception data"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<ReceptionContextValue | null>(() => {
    if (!profile) return null;
    return { profile, permissions, isLoading, error, refresh };
  }, [profile, permissions, isLoading, error, refresh]);

  if (isLoading && !value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading reception desk...</p>
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-lg font-semibold">Reception access required</p>
          <p className="text-sm text-muted-foreground">
            {error ?? "Your account is not linked to a reception desk profile."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={refresh} variant="outline">
              Try again
            </Button>
            <Link href="/login?role=receptionist">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white">Sign in</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ReceptionContext.Provider value={value}>{children}</ReceptionContext.Provider>;
}

export function useReception() {
  const ctx = useContext(ReceptionContext);
  if (!ctx) throw new Error("useReception must be used within ReceptionProvider");
  return ctx;
}
