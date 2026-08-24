import { createClient } from "@/lib/supabase/client";
import { validatePaymentProofFile } from "@/lib/storage/paymentProof";

const BUCKET = "payment-proofs";

export async function uploadSubscriptionProof(userId: string, file: File): Promise<string> {
  const validationError = validatePaymentProofFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const id = crypto.randomUUID();
  const path = `${userId}/subscription/${id}/proof.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
