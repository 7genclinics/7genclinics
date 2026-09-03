import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Reset password",
  description: "Choose a new password for your Apna Clinic account.",
  path: "/auth/reset-password/",
  index: false,
});

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
