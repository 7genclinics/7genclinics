import { privateSectionMetadata } from "@/lib/seo/metadata";

export const metadata = privateSectionMetadata("Video consultation");

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
