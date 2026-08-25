import type { SpecialtyIconId } from "@/lib/public/specialties";
import { cn } from "@/lib/utils";

/** Public folder: `public/speciality iconss/` */
const ICON_DIR = "/speciality%20iconss";

const ICON_SRC: Record<SpecialtyIconId, string> = {
  "breast-oncologist": `${ICON_DIR}/breast-oncologist.svg`,
  "child-specialist": `${ICON_DIR}/child-specialist.svg`,
  "clinical-psychologist": `${ICON_DIR}/pyschologist.svg`,
  "clinical-sexologist": `${ICON_DIR}/imgi_8_clinical-sexologist.svg`,
  "cosmetic-surgeon": `${ICON_DIR}/imgi_9_cosmetics.svg`,
  "critical-care": `${ICON_DIR}/imgi_10_critical-care-specialist.svg`,
  dentist: `${ICON_DIR}/imgi_11_dentist.svg`,
  dermatologist: `${ICON_DIR}/imgi_12_dermatology.svg`,
  endocrinologist: `${ICON_DIR}/imgi_13_endocrinologist.svg`,
  ent: `${ICON_DIR}/imgi_14_ENT-specialist.svg`,
  eye: `${ICON_DIR}/imgi_15_eye-specialist.svg`,
  "family-physician": `${ICON_DIR}/imgi_16_family-physician.svg`,
  gastroenterologist: `${ICON_DIR}/imgi_17_gastroenterologist.svg`,
  gynecologist: `${ICON_DIR}/imgi_18_gynecologist.svg`,
  liver: `${ICON_DIR}/imgi_19_liver-specialist.svg`,
  "medical-specialist": `${ICON_DIR}/imgi_20_medical-specialist.svg`,
  nephrologist: `${ICON_DIR}/imgi_21_nephrologist.svg`,
  "neuro-physician": `${ICON_DIR}/imgi_22_neuro-surgeon.svg`,
  "neuro-surgeon": `${ICON_DIR}/imgi_22_neuro-surgeon.svg`,
  nutritionist: `${ICON_DIR}/imgi_23_nutritionist-dietician.svg`,
  orthopedics: `${ICON_DIR}/imgi_24_orthopedics.svg`,
  physiotherapist: `${ICON_DIR}/imgi_25_physiotherapist.svg`,
  psychiatrist: `${ICON_DIR}/imgi_26_psychiatrist.svg`,
  pulmonologist: `${ICON_DIR}/imgi_27_pulmonologist.svg`,
  radiologist: `${ICON_DIR}/radiologist.svg`,
  rheumatologist: `${ICON_DIR}/imgi_28_rheumatologist.svg`,
  "speech-pathologist": `${ICON_DIR}/imgi_29_speech-therapist.svg`,
  surgeon: `${ICON_DIR}/imgi_30_surgeon.svg`,
  urologist: `${ICON_DIR}/imgi_31_urologist.svg`,
};

export function SpecialtyIcon({
  id,
  className,
}: {
  id: SpecialtyIconId;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local specialty SVGs */}
      <img
        src={ICON_SRC[id]}
        alt=""
        width={44}
        height={44}
        className="h-full w-full object-contain"
        aria-hidden
      />
    </span>
  );
}
