"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { acceptOrganizationInvite } from "@/lib/org/api";
import { getErrorMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

export default function JoinOrganizationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = String(params.token ?? "");
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing invite token");
      return;
    }
    void acceptOrganizationInvite(token)
      .then(() => {
        setStatus("ok");
        setTimeout(() => router.replace("/dashboard"), 1200);
      })
      .catch((err) => {
        setStatus("error");
        setError(getErrorMessage(err, "Could not accept invite"));
      });
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join clinic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === "working" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Accepting invite…
            </p>
          ) : null}
          {status === "ok" ? <p className="text-sm text-emerald-700">You joined the clinic. Redirecting…</p> : null}
          {status === "error" ? (
            <>
              <p className="text-sm text-red-600">{error}</p>
              <Button onClick={() => router.push("/login")}>Sign in</Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
