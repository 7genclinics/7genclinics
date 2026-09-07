"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { acceptOrganizationInvite } from "@/lib/org/api";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

type InvitePreview = {
  organization_name: string;
  email: string;
  member_role: string;
  status: string;
  expires_at: string;
};

function roleCopy(role: string) {
  if (role === "receptionist") return "receptionist";
  if (role === "doctor") return "doctor";
  if (role === "admin") return "clinic admin";
  return role;
}

export default function JoinOrganizationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = String(params.token ?? "");
  const [status, setStatus] = useState<"loading" | "needs-auth" | "working" | "ok" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing invite token");
      return;
    }

    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc("get_organization_invite_preview", {
        p_token: token,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (!cancelled && row) setPreview(row as InvitePreview);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setStatus("needs-auth");
        return;
      }

      if (!cancelled) setStatus("working");
      try {
        await acceptOrganizationInvite(token);
        if (cancelled) return;
        setStatus("ok");
        setTimeout(() => router.replace("/dashboard"), 1200);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(getErrorMessage(err, "Could not accept invite"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const loginHref = `/login?redirect=${encodeURIComponent(`/join/${token}`)}${
    preview?.member_role === "receptionist"
      ? "&role=receptionist"
      : preview?.member_role === "doctor"
        ? "&role=doctor"
        : ""
  }`;
  const registerHref = `/register?role=doctor&email=${encodeURIComponent(preview?.email ?? "")}&redirect=${encodeURIComponent(`/join/${token}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join clinic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview ? (
            <p className="text-sm text-muted-foreground">
              {preview.organization_name} invited {preview.email} as {roleCopy(preview.member_role)}.
            </p>
          ) : null}
          {status === "loading" || status === "working" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status === "working" ? "Accepting invite…" : "Loading invite…"}
            </p>
          ) : null}
          {status === "ok" ? <p className="text-sm text-emerald-700">You joined the clinic. Redirecting…</p> : null}
          {status === "needs-auth" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Sign in with the invited email to join. Doctors who do not have an account yet can register first.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => router.push(loginHref)}>Sign in</Button>
                {preview?.member_role === "doctor" || preview?.member_role === "admin" ? (
                  <Button variant="outline" onClick={() => router.push(registerHref)}>
                    Create doctor account
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
          {status === "error" ? (
            <>
              <p className="text-sm text-red-600">{error}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => router.push(loginHref)}>Sign in</Button>
                <Button variant="outline" onClick={() => router.push("/")}>
                  Home
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
