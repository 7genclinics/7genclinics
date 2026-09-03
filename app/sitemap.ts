import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo/site";
import { getPublishedLandingSlugs } from "@/lib/landing/public";
import { getListedOrganizationsServer } from "@/lib/public/organizations";
import { clinicPublicPath } from "@/lib/org/paths";
import { doctorPublicPath } from "@/lib/landing/slug";

function entry(
  path: string,
  extras?: Partial<MetadataRoute.Sitemap[number]>,
): MetadataRoute.Sitemap[number] {
  return {
    url: canonicalUrl(path),
    lastModified: new Date(),
    changeFrequency: extras?.changeFrequency ?? "weekly",
    priority: extras?.priority ?? 0.7,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    entry("/", { changeFrequency: "daily", priority: 1 }),
    entry("/doctors/", { changeFrequency: "daily", priority: 0.9 }),
    entry("/clinics/", { changeFrequency: "weekly", priority: 0.8 }),
    entry("/assessment/", { changeFrequency: "monthly", priority: 0.6 }),
    entry("/browse/conditions/", { changeFrequency: "monthly", priority: 0.5 }),
    entry("/browse/symptoms/", { changeFrequency: "monthly", priority: 0.5 }),
  ];

  const seen = new Set(urls.map((item) => item.url));

  try {
    const slugs = await getPublishedLandingSlugs();
    for (const row of slugs) {
      const path = doctorPublicPath(row.slug);
      const url = canonicalUrl(path);
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(entry(path, { changeFrequency: "weekly", priority: 0.8 }));
    }
  } catch {
    // keep static URLs
  }

  try {
    const clinics = await getListedOrganizationsServer();
    for (const clinic of clinics) {
      const path = clinicPublicPath(clinic.slug);
      const url = canonicalUrl(path);
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(entry(path, { changeFrequency: "weekly", priority: 0.75 }));
    }
  } catch {
    // keep existing URLs
  }

  return urls;
}
