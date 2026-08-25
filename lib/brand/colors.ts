/**
 * Apna Clinic palette — sampled from the seven triangles in the brand cone.
 */
export const CONE_COLORS = {
  teal: "#47AFA0",
  tealMuted: "#4E9A9F",
  blue: "#4066AE",
  blueDeep: "#406198",
  steel: "#1A3856",
  navy: "#0F142A",
  ink: "#0B1023",
} as const;

export const CONE_COLOR_LIST = [
  CONE_COLORS.teal,
  CONE_COLORS.tealMuted,
  CONE_COLORS.blue,
  CONE_COLORS.blueDeep,
  CONE_COLORS.steel,
  CONE_COLORS.navy,
  CONE_COLORS.ink,
] as const;

export const brandColors = {
  pale: "#E7F5F3",
  light: CONE_COLORS.teal,
  cyan: CONE_COLORS.tealMuted,
  primary: CONE_COLORS.teal,
  royal: CONE_COLORS.blue,
  navy: CONE_COLORS.navy,
  slate: CONE_COLORS.steel,
  ink: CONE_COLORS.ink,
  blueDeep: CONE_COLORS.blueDeep,
} as const;

export type ConeColor = keyof typeof CONE_COLORS;
export type BrandColor = keyof typeof brandColors;
