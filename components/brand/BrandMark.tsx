import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand/site";
import { CONE_COLORS, CONE_COLOR_LIST } from "@/lib/brand/colors";

type BrandMarkProps = {
  href?: string | null;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  inverted?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { mark: "h-8 w-8", word: "text-lg", gap: "gap-2" },
  md: { mark: "h-10 w-10", word: "text-xl", gap: "gap-2.5" },
  lg: { mark: "h-12 w-12", word: "text-2xl sm:text-3xl", gap: "gap-3" },
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
  wordmarkClassName,
  showWordmark = true,
  inverted = false,
  size = "md",
}: BrandMarkProps) {
  const s = sizeMap[size];
  const content = (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
          inverted ? "bg-white/10 ring-1 ring-white/20" : "bg-white shadow-sm ring-1 ring-black/5",
          s.mark,
          markClassName
        )}
        aria-hidden
      >
        <BrandCone className="h-[78%] w-[78%]" />
      </span>
      {showWordmark && (
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            inverted ? "text-white" : "text-brand-900",
            s.word,
            wordmarkClassName
          )}
        >
          {BRAND.shortName}
          <span className={cn("font-medium", inverted ? "text-white/75" : "text-brand-500")}>
            {" "}
            Clinic
          </span>
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center" aria-label={`${BRAND.name} home`}>
      {content}
    </Link>
  );
}
