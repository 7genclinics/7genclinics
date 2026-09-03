import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Account review",
  description: "Your Apna Clinic account is under review.",
  path: "/pending-review/",
  index: false,
});

export default function PendingReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
