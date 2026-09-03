import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Login",
  description: "Sign in to your Apna Clinic patient, doctor, or clinic account.",
  path: "/login/",
  index: false,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
