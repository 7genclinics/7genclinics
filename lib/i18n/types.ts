export type AppLocale = "en" | "ur";

export const LOCALE_STORAGE_KEY = "apna-clinic-patient-locale";

export type MessageTree = {
  [key: string]: string | MessageTree;
};

export function getMessage(
  tree: MessageTree,
  path: string,
  vars?: Record<string, string | number>,
): string {
  const parts = path.split(".");
  let node: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === "string") {
      node = undefined;
      break;
    }
    node = node[part];
  }
  let text = typeof node === "string" ? node : path;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }
  }
  return text;
}
