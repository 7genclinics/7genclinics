"use client";

import {
  Globe,
  ImageIcon,
  Megaphone,
  MessageCircle,
  Share2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const SERVICES = [
  {
    icon: Share2,
    title: "Social media ads",
    body: "Facebook, Instagram, and Google campaigns that send patients to your booking page.",
  },
  {
    icon: ImageIcon,
    title: "Content & creative",
    body: "Clinic-ready posts, reels, and ad creatives using your public profile and services.",
  },
  {
    icon: Globe,
    title: "Landing page promotion",
    body: "Traffic to your doctor landing page — the page you already edit under Public Profile.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp & local reach",
    body: "Reminders, clinic announcements, and city-level campaigns managed by the clinic team.",
  },
];

export default function DoctorMarketingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-background to-background p-6 sm:p-8">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600">
          <Megaphone className="h-4 w-4" />
          Clinic growth
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Grow your practice</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Superadmin will offer marketing services here — social ads, landing-page promotion, and
          other campaigns for your clinic brand. This page is a preview so you can see what is
          coming and decide if you want those services.
        </p>
        <Button className="mt-5" disabled>
          Request services — coming soon
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          A dedicated landing page from superadmin will be added later. Until then, keep your Public
          Profile complete so campaigns can use your photo, services, and booking links.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SERVICES.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
                <item.icon className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-brand-500" />
            What you can do now
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Finish your public profile and landing page. When superadmin launches marketing, those
            pages are what patients see from ads.
          </p>
          <p>
            No payment or signup is live on this screen yet. Treat it as an interest board — we will
            connect requests to the clinic admin when the services landing page is ready.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
