import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Forgot password",
  description: "Reset your Apna Clinic account password.",
  path: "/forgot-password/",
  index: false,
});

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
