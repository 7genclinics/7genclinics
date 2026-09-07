"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Phone, Mail, MapPin, Calendar, Heart, User, Loader2 } from "lucide-react";
import { usePatient } from "@/contexts/PatientContext";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { uploadAndSetAvatar } from "@/lib/auth/profile";
import { updateUserProfile } from "@/lib/patient/api";
import { formatLocalizedDate } from "@/lib/i18n/format";
import type { Gender } from "@/types";
import { getErrorMessage } from "@/lib/errors";
import { useLocale } from "@/contexts/LocaleContext";

export default function PatientProfilePage() {
  const { profile, setProfile } = usePatient();
  const { t, locale } = useLocale();
  const [profileForm, setProfileForm] = useState({
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    dob: profile.date_of_birth ?? "",
    gender: profile.gender ?? "male",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm({
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      dob: profile.date_of_birth ?? "",
      gender: profile.gender ?? "male",
    });
  }, [profile]);

  const handleAvatarUpload = async (file: File) => {
    const updated = await uploadAndSetAvatar(profile.id, file);
    setProfile(updated);
    setMessage(t("profile.photoUpdated"));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateUserProfile(profile.id, {
        full_name: profileForm.fullName.trim(),
        phone: profileForm.phone.trim() || null,
        city: profileForm.city.trim() || null,
        date_of_birth: profileForm.dob || null,
        gender: profileForm.gender as Gender,
      });
      setProfile(updated);
      setMessage(t("profile.updated"));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t("profile.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("profile.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <AvatarUpload
                name={profile.full_name}
                avatarUrl={profile.avatar_url}
                onUpload={handleAvatarUpload}
                onError={(msg) => setError(msg)}
                size="lg"
                hint={t("profile.photoHint")}
              />
              <div>
                <h3 className="font-bold text-lg">{profile.full_name}</h3>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
              <div className="border-t border-border pt-4 text-xs text-muted-foreground text-start space-y-2">
                <p><strong>{t("profile.role")}:</strong> {t("roles.patient")}</p>
                <p><strong>{t("profile.city")}:</strong> {profile.city ?? t("common.notSet")}</p>
                <p>
                  <strong>{t("profile.memberSince")}:</strong>{" "}
                  {formatLocalizedDate(profile.created_at, locale, { month: "long", year: "numeric" })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.personalDetails")}</CardTitle>
              <CardDescription>{t("profile.personalDetailsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && <p className="text-sm text-green-600">{message}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("profile.fullName")}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      required
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("profile.email")}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t("profile.emailSynced")}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("profile.phone")}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("profile.city")}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("profile.dob")}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={profileForm.dob}
                      onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("profile.gender")}</label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value as Gender })}
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="male">{t("profile.male")}</option>
                      <option value="female">{t("profile.female")}</option>
                      <option value="other">{t("profile.other")}</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border pt-4 flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t("common.saving")}
                  </>
                ) : (
                  t("common.saveChanges")
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
