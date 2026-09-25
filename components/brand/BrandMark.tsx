import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND, BRAND_ASSETS } from "@/lib/brand/site";
import { CONE_COLORS, CONE_COLOR_LIST } from "@/lib/brand/colors";

type BrandMarkProps = {
  href?: string | null;
  className?: string;
  markClassName?: string;
  /** @deprecated Logo includes wordmark — ignored. */
  wordmarkClassName?: string;
  /** @deprecated Logo includes wordmark — ignored. */
  showWordmark?: boolean;
  inverted?: boolean;
  /** Soft light plate behind logo on dark backgrounds (footer / auth aside). */
  variant?: "default" | "reverse";
  size?: "sm" | "md" | "lg" | "xl";
};

/** Intrinsic logo ratio from public/apnaclinic-logo.png (593×421). */
const LOGO_ASPECT = 593 / 421;

const sizeMap = {
  sm: { height: 40, className: "h-10 w-auto" },
  md: { height: 52, className: "h-12 w-auto sm:h-[3.25rem]" },
  lg: { height: 64, className: "h-14 w-auto sm:h-16" },
  xl: { height: 80, className: "h-[4.5rem] w-auto sm:h-20" },
} as const;

const FACETS: { points: string; fill: string }[] = [
  { points: "8,4 26,4 17,20", fill: CONE_COLORS.teal },
  { points: "26,4 44,4 35,20", fill: CONE_COLORS.navy },
  { points: "44,4 62,4 53,20", fill: CONE_COLORS.blue },
  { points: "17,20 35,20 26,36", fill: CONE_COLORS.tealMuted },
  { points: "35,20 53,20 44,36", fill: CONE_COLORS.blueDeep },
  { points: "26,36 44,36 35,52", fill: CONE_COLORS.steel },
  { points: "26,52 44,52 35,68", fill: CONE_COLORS.ink },
];

export function ConeStripe({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-1 w-full overflow-hidden", className)} aria-hidden>
      {CONE_COLOR_LIST.map((color) => (
        <span key={color} className="h-full flex-1" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export function BrandCone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 70 72" className={className} aria-hidden>
      {FACETS.map((facet) => (
        <polygon key={facet.points} points={facet.points} fill={facet.fill} />
      ))}
    </svg>
  );
}

export function BrandMark({
  href = "/",
  className,
  markClassName,
  inverted = false,
  variant = "default",
  size = "md",
}: BrandMarkProps) {
  const s = sizeMap[size];
  const onDark = variant === "reverse" || inverted;
  const width = Math.round(s.height * LOGO_ASPECT);
  const content = (
    <span
      className={cn(
        "inline-flex items-center",
        onDark && "rounded-2xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <Image
        src={BRAND_ASSETS.logo}
        alt={BRAND.name}
        width={width}
        height={s.height}
        priority
        unoptimized
        className={cn("object-contain object-left", s.className, markClassName)}
      />
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center" aria-label={`${BRAND.name} home`}>
      {content}
    </Link>
  );
}
