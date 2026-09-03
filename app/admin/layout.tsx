import type { Metadata } from "next";
import { privateSectionMetadata } from "@/lib/seo/metadata";
import AdminLayoutClient from "./admin-layout-client";

export const metadata: Metadata = privateSectionMetadata("Admin portal");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
