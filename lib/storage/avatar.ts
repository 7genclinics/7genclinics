import { createClient } from "@/lib/supabase/client";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const LANDING_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateAvatarFile(file: File, maxBytes = MAX_BYTES): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Please upload a JPEG, PNG, WebP, or GIF image.";
  }
  if (file.size > maxBytes) {
    return `Image must be smaller than ${Math.round(maxBytes / (1024 * 1024))}MB.`;
  }
  return null;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function uploadLandingImage(
  userId: string,
  file: File,
  kind: string,
): Promise<string> {
  const validationError = validateAvatarFile(file, LANDING_MAX_BYTES);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeKind = kind.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "image";
  const path = `${userId}/landing/${safeKind}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAvatar(userId: string): Promise<void> {
  const supabase = createClient();
  const { data: files } = await supabase.storage.from(BUCKET).list(userId);
  if (!files?.length) return;

  const paths = files.map((file) => `${userId}/${file.name}`);
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;
}
