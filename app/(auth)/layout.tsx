import Link from "next/link";
import { AuthAsidePanel } from "@/components/auth/AuthAsidePanel";
import { BrandMark } from "@/components/brand/BrandMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthAsidePanel />

      <div className="flex flex-col min-h-screen bg-[#f4faf9]">
        <div className="flex items-center justify-between px-6 py-4 lg:justify-end">
          <div className="lg:hidden">
            <BrandMark size="sm" />
          </div>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-6">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
