export const RECEPTION_ACCESS_KEYS = [
  "dashboard",
  "queue",
  "walk_in",
  "patients",
  "billing",
  "medicines",
  "subscription",
] as const;

export type ReceptionAccessKey = (typeof RECEPTION_ACCESS_KEYS)[number];
export type ReceptionAccessMode = "full" | "specific";

export type ReceptionModuleMap = Record<ReceptionAccessKey, boolean>;

export type ReceptionPermissions = {
  access: ReceptionAccessMode;
  modules: ReceptionModuleMap;
};

export const RECEPTION_ACCESS_LABELS: Record<ReceptionAccessKey, string> = {
  dashboard: "Dashboard",
  queue: "Queue",
  walk_in: "Walk-in registration",
  patients: "Patients",
  billing: "Billing",
  medicines: "Medicines",
  subscription: "Subscription",
};

export const RECEPTION_ACCESS_HREFS: Record<ReceptionAccessKey, string> = {
  dashboard: "/reception/dashboard",
  queue: "/reception/queue",
  walk_in: "/reception/walk-in",
  patients: "/reception/patients",
  billing: "/reception/billing",
  medicines: "/reception/medicines",
  subscription: "/reception/subscription",
};

export const ALL_RECEPTION_MODULES: ReceptionModuleMap = {
  dashboard: true,
  queue: true,
  walk_in: true,
  patients: true,
  billing: true,
  medicines: true,
  subscription: true,
};

export const NO_RECEPTION_MODULES: ReceptionModuleMap = {
  dashboard: false,
  queue: false,
  walk_in: false,
  patients: false,
  billing: false,
  medicines: false,
  subscription: false,
};

export const FULL_RECEPTION_PERMISSIONS: ReceptionPermissions = {
  access: "full",
  modules: ALL_RECEPTION_MODULES,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseModules(source: Record<string, unknown>): ReceptionModuleMap {
  const modules = { ...NO_RECEPTION_MODULES };
  for (const key of RECEPTION_ACCESS_KEYS) {
    modules[key] = Boolean(source[key] ?? source[`can_${key}`]);
  }
  return modules;
}

export function normalizeReceptionPermissions(value: unknown): ReceptionPermissions {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    return FULL_RECEPTION_PERMISSIONS;
  }

  if (value.access === "full" || value.full_access === true) {
    return FULL_RECEPTION_PERMISSIONS;
  }

  const moduleSource = isRecord(value.modules) ? value.modules : value;
  const modules = parseModules(moduleSource);

  if (value.access === "specific") {
    return { access: "specific", modules };
  }

  const anyEnabled = RECEPTION_ACCESS_KEYS.some((key) => modules[key]);
  if (anyEnabled) {
    return { access: "specific", modules };
  }

  return FULL_RECEPTION_PERMISSIONS;
}

export function receptionPermissionsPayload(permissions: ReceptionPermissions) {
  if (permissions.access === "full") {
    return { access: "full" as const };
  }
  return {
    access: "specific" as const,
    modules: permissions.modules,
  };
}

export function hasReceptionModule(
  permissions: ReceptionPermissions,
  key: ReceptionAccessKey
): boolean {
  if (permissions.access === "full") return true;
  return Boolean(permissions.modules[key]);
}

export function hasAnyReceptionModule(permissions: ReceptionPermissions): boolean {
  if (permissions.access === "full") return true;
  return RECEPTION_ACCESS_KEYS.some((key) => permissions.modules[key]);
}

export function receptionKeyForPath(path: string): ReceptionAccessKey | null {
  if (path.includes("/walk-in")) return "walk_in";
  if (path.includes("/queue")) return "queue";
  if (path.includes("/patients")) return "patients";
  if (path.includes("/billing")) return "billing";
  if (path.includes("/medicines")) return "medicines";
  if (path.includes("/subscription")) return "subscription";
  if (path.includes("/dashboard")) return "dashboard";
  return null;
}

export function firstAllowedReceptionPath(permissions: ReceptionPermissions): string {
  for (const key of RECEPTION_ACCESS_KEYS) {
    if (hasReceptionModule(permissions, key)) {
      return RECEPTION_ACCESS_HREFS[key];
    }
  }
  return RECEPTION_ACCESS_HREFS.dashboard;
}

export function receptionAccessSummary(permissions: ReceptionPermissions): string {
  if (permissions.access === "full") return "Full access";
  const labels = RECEPTION_ACCESS_KEYS.filter((key) => permissions.modules[key]).map(
    (key) => RECEPTION_ACCESS_LABELS[key]
  );
  if (labels.length === 0) return "No modules";
  if (labels.length === RECEPTION_ACCESS_KEYS.length) return "Full access";
  return labels.join(", ");
}

export function canVisitReceptionPath(
  permissions: ReceptionPermissions,
  path: string,
  options?: { frozen?: boolean }
): boolean {
  if (options?.frozen && path.includes("/subscription")) return true;
  const key = receptionKeyForPath(path);
  if (!key) return true;
  return hasReceptionModule(permissions, key);
}
