import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand/site";
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
  /** Light logo for dark backgrounds (footer). */
  variant?: "default" | "reverse";
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { height: 32, className: "h-8 w-auto" },
  md: { height: 40, className: "h-9 w-auto sm:h-10" },
  lg: { height: 48, className: "h-11 w-auto sm:h-12" },
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
  const useReverse = variant === "reverse" || inverted;
  const content = (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src={useReverse ? "/apna-clinic-logo-reverse.png" : "/apna-clinic-logo.png"}
        alt={BRAND.name}
        width={220}
        height={s.height}
        priority
        unoptimized
        className={cn(s.className, markClassName)}
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
