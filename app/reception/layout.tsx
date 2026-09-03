import type { Metadata } from "next";
import { privateSectionMetadata } from "@/lib/seo/metadata";
import ReceptionLayoutClient from "./reception-layout-client";

export const metadata: Metadata = privateSectionMetadata("Reception portal");

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  return <ReceptionLayoutClient>{children}</ReceptionLayoutClient>;
}
