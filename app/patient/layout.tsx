import type { Metadata } from "next";
import { privateSectionMetadata } from "@/lib/seo/metadata";
import PatientLayoutClient from "./patient-layout-client";

export const metadata: Metadata = privateSectionMetadata("Patient portal");

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <PatientLayoutClient>{children}</PatientLayoutClient>;
}
