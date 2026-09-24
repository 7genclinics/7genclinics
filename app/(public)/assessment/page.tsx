import { redirect } from "next/navigation";

/** Old self-assessment route — removed. Keep redirect for bookmarks/SEO. */
export default function LegacyAssessmentRedirectPage() {
  redirect("/doctors/");
}
