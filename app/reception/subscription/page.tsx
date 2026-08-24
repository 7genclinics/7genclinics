"use client";

import { SubscriptionWorkspace } from "@/components/subscription/SubscriptionWorkspace";
import { useReception } from "@/contexts/ReceptionContext";

export default function ReceptionSubscriptionPage() {
  const { profile } = useReception();
  return <SubscriptionWorkspace userId={profile.id} roleLabel="reception" />;
}
