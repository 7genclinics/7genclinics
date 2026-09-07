"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { usePathname } from "next/navigation";
import { AuthSessionListener } from "@/components/auth/AuthSessionListener";
import { PatientProvider, usePatient } from "@/contexts/PatientContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";

function PatientLayoutShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = usePatient();
  const { t, isUrdu, dir } = useLocale();

  const getPageTitle = (path: string) => {
    if (path.includes("/assessments")) return t("titles.assessments");
    if (path.includes("/assessment")) return t("titles.assessment");
    if (path.includes("/dashboard")) return t("titles.dashboard");
    if (path.includes("/appointments")) return t("titles.appointments");
    if (path.includes("/doctors")) return t("titles.doctors");
    if (path.includes("/prescriptions")) return t("titles.prescriptions");
    if (path.includes("/payments")) return t("titles.payments");
    if (path.includes("/profile")) return t("titles.profile");
    if (path.includes("/chat")) return t("titles.chat");
    return t("titles.portal");
  };

  const isChat = pathname.includes("/chat");

  return (
    <NotificationProvider userId={profile.id}>
      <ChatProvider myId={profile.id} myName={profile.full_name}>
        <div
          dir={dir}
          lang={isUrdu ? "ur" : "en"}
          className={cn(
            isChat ? "h-dvh max-h-dvh overflow-hidden bg-muted/30" : "min-h-screen bg-muted/30",
            isUrdu && "font-[family-name:var(--font-urdu)]",
          )}
        >
          <AuthSessionListener />
          <Sidebar
            role="patient"
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <div
            className={cn(
              "flex flex-col transition-all duration-200",
              isChat ? "h-full min-h-0 overflow-hidden" : "min-h-screen",
              isUrdu ? "md:pr-64 md:pl-0" : "md:pl-64",
            )}
          >
            <Header
              title={getPageTitle(pathname)}
              user={{
                name: profile.full_name,
                email: profile.email,
                role: "patient",
                avatarUrl: profile.avatar_url ?? undefined,
              }}
              onMenuClick={() => setIsSidebarOpen(true)}
            />
            <main
              className={
                isChat
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden p-0 md:p-6 md:container md:max-w-7xl md:mx-auto"
                  : "flex-1 p-4 md:p-6 container max-w-7xl mx-auto"
              }
            >
              {children}
            </main>
          </div>
        </div>
      </ChatProvider>
    </NotificationProvider>
  );
}

export default function PatientLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      <LocaleProvider>
        <PatientLayoutShell>{children}</PatientLayoutShell>
      </LocaleProvider>
    </PatientProvider>
  );
}
