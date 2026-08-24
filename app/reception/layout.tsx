"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { usePathname } from "next/navigation";
import { AuthSessionListener } from "@/components/auth/AuthSessionListener";
import { ReceptionProvider, useReception } from "@/contexts/ReceptionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SubscriptionReminder } from "@/components/subscription/SubscriptionReminder";

function ReceptionLayoutShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = useReception();

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

  return (
    <NotificationProvider userId={profile.id}>
      <div className="min-h-screen bg-muted/30">
        <AuthSessionListener />
        <Sidebar
          role="receptionist"
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
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
          <main className="flex-1 p-4 md:p-6 container max-w-7xl mx-auto">{children}</main>
        </div>
        <SubscriptionReminder portal="reception" />
      </div>
    </NotificationProvider>
  );
}

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReceptionProvider>
      <SubscriptionProvider>
        <ReceptionLayoutShell>{children}</ReceptionLayoutShell>
      </SubscriptionProvider>
    </ReceptionProvider>
  );
}
