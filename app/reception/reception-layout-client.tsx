"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { usePathname, useRouter } from "next/navigation";
import { AuthSessionListener } from "@/components/auth/AuthSessionListener";
import { ReceptionProvider, useReception } from "@/contexts/ReceptionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { SubscriptionReminder } from "@/components/subscription/SubscriptionReminder";
import {
  RECEPTION_ACCESS_HREFS,
  RECEPTION_ACCESS_KEYS,
  canVisitReceptionPath,
  firstAllowedReceptionPath,
  hasAnyReceptionModule,
  hasReceptionModule,
} from "@/lib/doctor/reception-permissions";

function ReceptionLayoutShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { profile, permissions } = useReception();
  const { snapshot } = useSubscription();
  const frozen = Boolean(snapshot?.frozen);

  const allowedHrefs = useMemo(() => {
    if (frozen) return [RECEPTION_ACCESS_HREFS.subscription];
    return RECEPTION_ACCESS_KEYS.filter((key) => hasReceptionModule(permissions, key)).map(
      (key) => RECEPTION_ACCESS_HREFS[key]
    );
  }, [frozen, permissions]);

  useEffect(() => {
    if (canVisitReceptionPath(permissions, pathname, { frozen })) return;
    router.replace(frozen ? RECEPTION_ACCESS_HREFS.subscription : firstAllowedReceptionPath(permissions));
  }, [frozen, pathname, permissions, router]);

  const getPageTitle = (path: string) => {
    if (path.includes("/dashboard")) return "Reception Dashboard";
    if (path.includes("/queue")) return "Clinic Queue";
    if (path.includes("/walk-in")) return "Walk-In Registration";
    if (path.includes("/patients")) return "Patients";
    if (path.includes("/billing")) return "Desk Billing";
    if (path.includes("/medicines")) return "Doctor Medicines";
    if (path.includes("/subscription")) return "Subscription";
    return "Reception";
  };

  const blocked = !frozen && !hasAnyReceptionModule(permissions);

  return (
    <NotificationProvider userId={profile.id}>
      <div className="min-h-screen bg-muted/30">
        <AuthSessionListener />
        <Sidebar
          role="receptionist"
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          allowedHrefs={allowedHrefs}
        />
        <div className="flex min-h-screen flex-col md:pl-64">
          <Header
            title={getPageTitle(pathname)}
            user={{
              name: profile.full_name,
              email: profile.email,
              role: "receptionist",
              avatarUrl: profile.avatar_url ?? undefined,
            }}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
          <main className="flex-1 p-4 md:p-6 container max-w-7xl mx-auto">
            {blocked ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
                Your doctor has not assigned any reception pages to this login. Ask them to update your access.
              </div>
            ) : (
              children
            )}
          </main>
        </div>
        <SubscriptionReminder portal="reception" />
      </div>
    </NotificationProvider>
  );
}

export default function ReceptionLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ReceptionProvider>
      <SubscriptionProvider>
        <ReceptionLayoutShell>{children}</ReceptionLayoutShell>
      </SubscriptionProvider>
    </ReceptionProvider>
  );
}
