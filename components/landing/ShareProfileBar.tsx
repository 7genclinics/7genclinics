"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  MessageCircle,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { absoluteDoctorUrl } from "@/lib/landing/slug";

function twitterShareUrl(url: string, text: string) {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function ShareProfileBar({
  slug,
  doctorName,
}: {
  slug: string;
  doctorName: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => absoluteDoctorUrl(slug), [slug]);
  const text = `Book an appointment with ${doctorName}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Share2 className="h-4 w-4" />
        Share your doctor profile with patients
      </p>
      <p className="mt-2 truncate rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        {url || `/doctors/${slug}`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="outline">
            <MessageCircle className="mr-1 h-3.5 w-3.5" />
            WhatsApp
          </Button>
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="outline">
            Facebook
          </Button>
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="outline">
            LinkedIn
          </Button>
        </a>
        <a href={twitterShareUrl(url, text)} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">
            X
          </Button>
        </a>
      </div>
    </div>
  );
}
