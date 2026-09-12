"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Clock, Loader2, PhoneOff, ShieldCheck, Video, XCircle } from "lucide-react";
import { getCurrentAuthUser } from "@/lib/auth/current-user";

interface JoinInfo {
  domain: string;
  room: string;
  jwt: string | null;
  jwtConfigured: boolean;
  role: "moderator" | "participant";
  displayName: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  doctorName: string;
  patientName: string;
}

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "too_early"; opensAt: string; message: string }
  | { kind: "waiting_for_doctor"; info: JoinInfo }
  | { kind: "in_call"; info: JoinInfo };

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JitsiMeetExternalAPI?: any;
  }
}

function loadJitsiScript(domain: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const script = document.createElement("script");
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the video library."));
    document.body.appendChild(script);
  });
}

export default function VideoConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leavingRef = useRef(false);

  const requestJoin = useCallback(async (): Promise<
    | { ok: true; info: JoinInfo }
    | { ok: false; status: number; error: string; message?: string; opensAt?: string }
  > => {
    await getCurrentAuthUser();

    const post = () =>
      fetch("/api/video/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

    let res = await post();
    if (res.status === 401) {
      await getCurrentAuthUser();
      res = await post();
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: body.error ?? "Failed to join",
        message: body.message,
        opensAt: body.opensAt,
      };
    }
    return { ok: true, info: body as JoinInfo };
  }, [appointmentId]);

  const enterCall = useCallback(
    async (info: JoinInfo) => {
      try {
        await loadJitsiScript(info.domain);
      } catch {
        setPhase({ kind: "error", message: "Could not load the video client. Check your connection and retry." });
        return;
      }
      setPhase({ kind: "in_call", info });
    },
    []
  );

  // Initial join attempt.
  useEffect(() => {
    let stopped = false;
    (async () => {
      const result = await requestJoin();
      if (stopped) return;
      if (!result.ok) {
        if (result.status === 401) {
          setPhase({
            kind: "error",
            message:
              "Your clinic session expired. Sign in again, then open this consultation from Appointments — you will not be asked to log into the video room itself.",
          });
          return;
        }
        if (result.status === 425 && result.opensAt) {
          setPhase({ kind: "too_early", opensAt: result.opensAt, message: result.message ?? "" });
        } else {
          setPhase({ kind: "error", message: result.message ?? result.error });
        }
        return;
      }
      const info = result.info;
      // Patient waits until the doctor has started the session.
      if (info.role === "participant" && info.status !== "ongoing") {
        setPhase({ kind: "waiting_for_doctor", info });
      } else {
        enterCall(info);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [requestJoin, enterCall, appointmentId, router]);

  // Waiting room: poll until the doctor starts the meeting (or cancels).
  useEffect(() => {
    if (phase.kind !== "waiting_for_doctor") return;
    pollRef.current = setInterval(async () => {
      const result = await requestJoin();
      if (!result.ok) {
        if (result.status === 401) return;
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase({
          kind: "error",
          message: result.message ?? result.error ?? "This appointment is no longer available.",
        });
        return;
      }
      if (result.info.status === "ongoing") {
        if (pollRef.current) clearInterval(pollRef.current);
        enterCall(result.info);
      }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase.kind, requestJoin, enterCall]);

  const dashboardPath = (role: "moderator" | "participant") =>
    role === "moderator" ? "/doctor/appointments/" : "/patient/appointments/";

  const leaveToDashboard = useCallback((role: "moderator" | "participant") => {
    window.location.replace(dashboardPath(role));
  }, []);

  const recordConsultationEnded = useCallback(async () => {
    try {
      await fetch("/api/video/ended", {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
    } catch {
      /* still leave the room so ads / parent redirects cannot trap the session */
    }
  }, [appointmentId]);

  const endCallAndLeave = useCallback(
    async (role: "moderator" | "participant", recordEnd: boolean) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      if (recordEnd && role === "moderator") {
        await recordConsultationEnded();
      }
      if (containerRef.current) {
        containerRef.current.replaceChildren();
      }
      try {
        apiRef.current?.dispose();
      } catch {
        /* iframe already gone */
      }
      apiRef.current = null;
      window.location.replace(dashboardPath(role));
    },
    [recordConsultationEnded]
  );

  // Mount the Jitsi iframe once in-call.
  useEffect(() => {
    if (phase.kind !== "in_call" || leavingRef.current || !containerRef.current || !window.JitsiMeetExternalAPI) {
      return;
    }
    const { info } = phase;
    let disposed = false;
    let joined = false;

    const api = new window.JitsiMeetExternalAPI(info.domain, {
      roomName: info.room,
      parentNode: containerRef.current,
      ...(info.jwt ? { jwt: info.jwt } : {}),
      userInfo: { displayName: info.displayName },
      sandbox:
        "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation allow-downloads",
      configOverwrite: {
        prejoinConfig: { enabled: false },
        disableDeepLinking: true,
        deeplinking: { disabled: true, hideLogo: true },
        enableClosePage: false,
        enableWelcomePage: false,
        enableLobbyChat: false,
        requireDisplayName: false,
        hideEmailInSettings: true,
        analytics: { disabled: true },
        startWithAudioMuted: false,
        subject: `Consultation — ${info.doctorName} / ${info.patientName}`,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        SHOW_PROMOTIONAL_ICONS: false,
        MOBILE_APP_PROMO: false,
        HIDE_DEEP_LINKING_LOGO: true,
        AUTHENTICATION_ENABLE: false,
      },
    });
    apiRef.current = api;

    const failCall = (message: string) => {
      if (disposed || leavingRef.current) return;
      setPhase({ kind: "error", message });
    };

    api.addListener("videoConferenceJoined", async () => {
      joined = true;
      if (info.role !== "moderator") return;
      if (info.jwtConfigured) {
        api.executeCommand("toggleLobby", true);
      }
      await fetch("/api/video/started", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
    });
    api.addListener(
      "errorOccurred",
      (error: { type?: string; message?: string; isFatal?: boolean }) => {
        if (disposed || leavingRef.current) return;
        // Startup noise and React Strict Mode dispose() must not kill the room.
        if (error?.isFatal === false) return;
        const text = `${error?.type ?? ""} ${error?.message ?? ""}`.toLowerCase();
        const isDisposeNoise =
          text.includes("conference.destroyed") ||
          text.includes("connection.dropped") ||
          text.includes("conference.left");
        if (isDisposeNoise) return;
        if (error?.isFatal !== true && !text.includes("connectionerror") && !text.includes("not-allowed")) {
          return;
        }
        const isAuthError =
          text.includes("auth") ||
          text.includes("token") ||
          text.includes("expired") ||
          text.includes("not allowed") ||
          text.includes("not-allowed") ||
          text.includes("login");
        failCall(
          isAuthError
            ? "The meeting room could not authenticate. Ask support to set JITSI_DOMAIN, JITSI_APP_ID, and JITSI_APP_SECRET, then try again."
            : "The video room could not start. Close other camera apps, allow camera and microphone, then try again.",
        );
      }
    );
    // Jitsi may fire readyToClose on refresh/dispose/network blips — leave the room
    // but do NOT mark the visit completed unless the doctor pressed End consultation.
    api.addListener("readyToClose", () => {
      if (disposed || leavingRef.current) return;
      void endCallAndLeave(info.role, false);
    });

    const joinWatchdog = window.setTimeout(() => {
      if (disposed || joined || leavingRef.current) return;
      failCall(
        "The video room did not start. Allow camera and microphone, then try again. For clinic launch, configure your own Jitsi server.",
      );
    }, 25_000);

    return () => {
      disposed = true;
      window.clearTimeout(joinWatchdog);
      try {
        api.dispose();
      } catch {
        /* iframe already gone */
      }
      apiRef.current = null;
    };
  }, [phase, endCallAndLeave, appointmentId]);

  if (phase.kind === "loading") {
    return (
      <Shell>
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        <p className="text-sm text-slate-300 mt-4">Preparing your secure consultation room…</p>
      </Shell>
    );
  }

  if (phase.kind === "too_early") {
    const opens = new Date(phase.opensAt);
    return (
      <Shell>
        <Clock className="h-10 w-10 text-amber-400" />
        <h1 className="text-lg font-bold text-white mt-4">The room isn't open yet</h1>
        <p className="text-sm text-slate-300 mt-2 max-w-sm text-center">{phase.message}</p>
        <p className="text-xs text-slate-400 mt-2">
          Opens at {opens.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <Button className="mt-6" variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </Shell>
    );
  }

  if (phase.kind === "error") {
    return (
      <Shell>
        <XCircle className="h-10 w-10 text-rose-400" />
        <h1 className="text-lg font-bold text-white mt-4">Unable to join</h1>
        <p className="text-sm text-slate-300 mt-2 max-w-sm text-center">{phase.message}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Go back
          </Button>
          {phase.message.toLowerCase().includes("sign in") ? (
            <Button
              onClick={() =>
                router.replace(`/login?redirect=${encodeURIComponent(`/video/${appointmentId}`)}`)
              }
            >
              Sign in
            </Button>
          ) : (
            <Button onClick={() => window.location.reload()}>Try again</Button>
          )}
        </div>
      </Shell>
    );
  }

  if (phase.kind === "waiting_for_doctor") {
    return (
      <Shell>
        <div className="relative">
          <Video className="h-10 w-10 text-brand-400" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500" />
          </span>
        </div>
        <h1 className="text-lg font-bold text-white mt-4">
          Waiting for {phase.info.doctorName} to start the consultation…
        </h1>
        <p className="text-sm text-slate-300 mt-2 max-w-sm text-center">
          You'll be connected automatically as soon as your doctor opens the room. Keep this
          page open.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-4">
          <ShieldCheck className="h-3.5 w-3.5" />
          Private, encrypted room — only you and your doctor can join.
        </div>
        <Button className="mt-6" variant="outline" onClick={() => leaveToDashboard("participant")}>
          <PhoneOff className="h-4 w-4 mr-2" />
          Leave waiting room
        </Button>
      </Shell>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider">Live consultation</span>
          <span className="text-slate-500">
            {phase.info.doctorName} / {phase.info.patientName}
          </span>
          {!phase.info.jwtConfigured && (
            <span className="hidden sm:inline rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              Host login may appear — configure Jitsi JWT for seamless join
            </span>
          )}
        </div>
        <Button
          size="sm"
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold h-8"
          onClick={() => {
            void endCallAndLeave(phase.info.role, phase.info.role === "moderator");
          }}
        >
          <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
          {phase.info.role === "moderator" ? "End consultation" : "Leave"}
        </Button>
      </div>
      <div ref={containerRef} className="flex-1 [&>iframe]:h-full [&>iframe]:w-full" />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
      {children}
    </div>
  );
}
