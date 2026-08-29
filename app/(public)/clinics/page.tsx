import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { ClinicDirectoryCards } from "@/components/public/LandingClinicsSection";
import { getListedOrganizationsServer } from "@/lib/public/organizations";
import { BRAND } from "@/lib/brand/site";

export const metadata = {
  title: `Clinics & hospitals | ${BRAND.name}`,
  description: "Browse listed clinics and hospitals, then book a doctor for video or an in-person visit.",
};

export default async function ClinicsDirectoryPage() {
  let clinics: Awaited<ReturnType<typeof getListedOrganizationsServer>> = [];
  try {
    clinics = await getListedOrganizationsServer();
  } catch {
    clinics = [];
  }

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
          Directory
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Clinics and hospitals
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Each listing is its own clinic. Doctors keep their public profile; book from the clinic page or the doctor directory.
        </p>
        {clinics.length === 0 ? (
          <p className="mt-10 text-sm text-slate-500">No clinics are listed yet.</p>
        ) : (
          <ClinicDirectoryCards clinics={clinics} />
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
