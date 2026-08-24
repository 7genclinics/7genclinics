"use client";

import { SubscriptionWorkspace } from "@/components/subscription/SubscriptionWorkspace";
import { useDoctor } from "@/contexts/DoctorContext";

export default function DoctorSubscriptionPage() {
  const { profile } = useDoctor();
  return <SubscriptionWorkspace userId={profile.id} roleLabel="the doctor" />;
}
