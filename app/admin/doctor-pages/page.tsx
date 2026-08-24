"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import {
  adminSetFeatured,
  adminSetLandingStatus,
  getAdminLandingPages,
  getAdminReviews,
  getLandingDefaults,
  moderateReview,
  saveLandingDefaults,
} from "@/lib/landing/api";
import type {
  AdminLandingPageRow,
  LandingClinicDefaults,
  LandingPageStatus,
  ModeratedReview,
  ReviewModerationStatus,
} from "@/lib/landing/types";

export default function AdminDoctorPagesPage() {
  const [tab, setTab] = useState<"pages" | "reviews" | "settings">("pages");
  const [pages, setPages] = useState<AdminLandingPageRow[]>([]);
  const [reviews, setReviews] = useState<ModeratedReview[]>([]);
  const [defaults, setDefaults] = useState<LandingClinicDefaults | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LandingPageStatus | "all">("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewModerationStatus | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [pageRows, reviewRows, clinic] = await Promise.all([
        getAdminLandingPages(),
        getAdminReviews(),
        getLandingDefaults(),
      ]);
      setPages(pageRows);
      setReviews(reviewRows);
      setDefaults(clinic);
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to load doctor pages."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesQuery =
        !query ||
        page.doctorName.toLowerCase().includes(query.toLowerCase()) ||
        page.slug.includes(query.toLowerCase()) ||
        page.specialization.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || page.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [pages, query, statusFilter]);

  const filteredReviews = useMemo(
    () =>
      reviewFilter === "all"
        ? reviews
        : reviews.filter((row) => row.moderationStatus === reviewFilter),
    [reviewFilter, reviews],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {toast}
        </div>
      )}
      <div>
        <h1 className="font-heading text-2xl font-semibold">Doctor public pages</h1>
        <p className="text-sm text-muted-foreground">
          Publish, feature, and moderate the shareable doctor landing pages.
        </p>
      </div>

      <div className="flex gap-2">
        {(["pages", "reviews", "settings"] as const).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={tab === item ? "default" : "outline"}
            onClick={() => setTab(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      {tab === "pages" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search doctor or slug"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-lg border border-input px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LandingPageStatus | "all")}
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPages.map((page) => (
                  <tr key={page.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{page.doctorName}</p>
                      <p className="text-xs text-muted-foreground">{page.specialization}</p>
                    </td>
                    <td className="px-4 py-3">/doctors/{page.slug}</td>
                    <td className="px-4 py-3 capitalize">{page.status}</td>
                    <td className="px-4 py-3">{page.isFeatured ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/doctors/${page.slug}?preview=1`} target="_blank">
                          <Button size="sm" variant="outline">
                            Preview
                          </Button>
                        </Link>
                        {page.status === "published" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await adminSetLandingStatus(page.doctorId, "unpublished");
                              showToast("Unpublished.");
                              await load();
                            }}
                          >
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={async () => {
                              await adminSetLandingStatus(page.doctorId, "published");
                              showToast("Published.");
                              await load();
                            }}
                          >
                            Publish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await adminSetFeatured(page.doctorId, !page.isFeatured);
                            await load();
                          }}
                        >
                          {page.isFeatured ? "Unfeature" : "Feature"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPages.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No pages found.</p>
            )}
          </div>
        </div>
      )}

      {tab === "reviews" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={reviewFilter === value ? "default" : "outline"}
                onClick={() => setReviewFilter(value)}
              >
                {value}
              </Button>
            ))}
          </div>
          {filteredReviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{review.displayName}</p>
                <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  {review.rating}/5 · {review.moderationStatus}
                </span>
              </div>
              {review.comment && (
                <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
              )}
              <div className="mt-3 flex gap-2">
                {review.moderationStatus !== "approved" && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await moderateReview(review.id, "approved");
                      showToast("Review published.");
                      await load();
                    }}
                  >
                    Approve
                  </Button>
                )}
                {review.moderationStatus !== "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await moderateReview(review.id, "rejected");
                      showToast("Review hidden.");
                      await load();
                    }}
                  >
                    Reject
                  </Button>
                )}
              </div>
            </article>
          ))}
          {filteredReviews.length === 0 && (
            <p className="text-sm text-muted-foreground">No reviews in this queue.</p>
          )}
        </div>
      )}

      {tab === "settings" && defaults && (
        <form
          className="max-w-xl space-y-3 rounded-xl border border-border bg-card p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            await saveLandingDefaults(defaults);
            showToast("Global landing defaults saved.");
          }}
        >
          <p className="text-sm text-muted-foreground">
            Defaults used when a doctor has not filled clinic details.
          </p>
          {(
            [
              ["clinicName", "Clinic name"],
              ["clinicAddress", "Address"],
              ["clinicCity", "City"],
              ["clinicPhone", "Phone"],
              ["clinicMapUrl", "Map URL"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              {label}
              <Input
                className="mt-1"
                value={defaults[key]}
                onChange={(e) => setDefaults({ ...defaults, [key]: e.target.value })}
              />
            </label>
          ))}
          <Button type="submit">Save defaults</Button>
        </form>
      )}
    </div>
  );
}
