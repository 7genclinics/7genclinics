import Image from "next/image";

/** Welcome-banner watermark — Gen Marketing partner mark on dashboards. */
export function DashboardBrandDecoration() {
  return (
    <Image
      src="/gen-marketing-logo.png"
      alt=""
      width={320}
      height={220}
      className="h-24 w-auto max-w-[min(100%,280px)] object-contain sm:h-32 lg:h-40"
      aria-hidden
      priority={false}
    />
  );
}
