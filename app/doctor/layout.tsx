import type { Metadata } from "next";
import { privateSectionMetadata } from "@/lib/seo/metadata";
import DoctorLayoutClient from "./doctor-layout-client";

export const metadata: Metadata = privateSectionMetadata("Doctor portal");

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <DoctorLayoutClient>{children}</DoctorLayoutClient>;
}
