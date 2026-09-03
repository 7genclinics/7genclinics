import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Create account",
  description: "Create an Apna Clinic account to book verified doctors online or in clinic.",
  path: "/register/",
  index: false,
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
