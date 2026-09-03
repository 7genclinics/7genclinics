import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/patient/",
          "/doctor/",
          "/reception/",
          "/api/",
          "/video/",
          "/join/",
          "/auth/",
          "/pending-review/",
        ],
      },
    ],
    sitemap: `${SITE_URL}sitemap.xml`,
    host: "https://apnaclinic.pk",
  };
}
