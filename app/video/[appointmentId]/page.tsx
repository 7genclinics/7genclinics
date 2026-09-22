"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PhoneOff,
  ShieldCheck,
  Video,
  XCircle,
} from "lucide-react";
import { getCurrentAuthUser } from "@/lib/auth/current-user";

interface JoinInfo {
  domain: string;
  room: string;
  scriptUrl?: string;
  provider?: "jaas" | "self_hosted" | "public";
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
  | { kind: "in_call"; info: JoinInfo }
  | {
      kind: "consultation_ended";
      reason: "manual" | "time_expired" | "doctor_ended";
      info: JoinInfo;
    };

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JitsiMeetExternalAPI?: any;
  }
}

function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function loadJitsiScript(info: Pick<JoinInfo, "domain" | "scriptUrl">): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const script = document.createElement("script");
    script.src = info.scriptUrl ?? `https://${info.domain}/external_api.js`;
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
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [dismissedWarning, setDismissedWarning] = useState<"5m" | "1m" | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(8);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inCallPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
        await loadJitsiScript(info);
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

  const dashboardPath = useCallback((role: "moderator" | "participant") =>
    role === "moderator" ? "/doctor/appointments/" : "/patient/appointments/", []);

  const leaveToDashboard = useCallback((role: "moderator" | "participant") => {
    window.location.replace(dashboardPath(role));
  }, [dashboardPath]);

  const recordConsultationEnded = useCallback(
    async (reason?: "manual" | "time_expired" | "doctor_ended") => {
      try {
        await fetch("/api/video/ended", {
          method: "POST",
          credentials: "include",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId,
            reason: reason ?? "doctor_ended",
          }),
        });
      } catch {
        /* still leave the room so ads / parent redirects cannot trap the session */
      }
    },
    [appointmentId]
  );

  const endCallAndLeave = useCallback(
    async (
      role: "moderator" | "participant",
      recordEnd: boolean,
      reason: "manual" | "time_expired" | "doctor_ended" = "manual",
      currentInfo?: JoinInfo
    ) => {
      if (leavingRef.current) return;
      leavingRef.current = true;

      if (timerRef.current) clearInterval(timerRef.current);
      if (inCallPollRef.current) clearInterval(inCallPollRef.current);

      // Close the visit in our DB and tell Jitsi to end the room for everyone.
      if (recordEnd) {
        await recordConsultationEnded(reason);
        try {
          apiRef.current?.executeCommand("endConference");
        } catch {
          /* older embeds may not support endConference */
        }
      }

      try {
        apiRef.current?.executeCommand("hangup");
      } catch {
        /* ignore hangup error if already closing */
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

      // Transition to dedicated consultation ended screen instead of sudden abrupt redirect.
      const infoToUse = currentInfo ?? (phase.kind === "in_call" ? phase.info : null);
      if (infoToUse) {
        setPhase({
          kind: "consultation_ended",
          reason,
          info: infoToUse,
        });
      } else {
        window.location.replace(dashboardPath(role));
      }
    },
    [recordConsultationEnded, dashboardPath, phase]
  );

  // In-call countdown timer and slot duration enforcement.
  useEffect(() => {
    if (phase.kind !== "in_call") return;
    const { info } = phase;
    const scheduledStart = new Date(info.scheduledAt).getTime();
    const duration = info.durationMinutes || 30;
    const scheduledEnd = scheduledStart + duration * 60_000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((scheduledEnd - now) / 1000));
      setSecondsRemaining(remaining);

      // If the slot time is up (00:00), automatically stop and complete the meeting!
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        void endCallAndLeave(info.role, true, "time_expired", info);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    // In-call heartbeat / status polling every 10 seconds to detect if ended by other party.
    inCallPollRef.current = setInterval(async () => {
      const result = await requestJoin();
      if (!result.ok) {
        if (result.status === 409 || result.status === 410) {
          if (inCallPollRef.current) clearInterval(inCallPollRef.current);
          void endCallAndLeave(info.role, false, "doctor_ended", info);
        }
        return;
      }
      if (result.info.status === "completed") {
        if (inCallPollRef.current) clearInterval(inCallPollRef.current);
        void endCallAndLeave(info.role, false, "doctor_ended", info);
      }
    }, 10_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (inCallPollRef.current) clearInterval(inCallPollRef.current);
    };
  }, [phase, endCallAndLeave, requestJoin]);

  // Consultation ended screen auto-redirect countdown.
  useEffect(() => {
    if (phase.kind !== "consultation_ended") return;
    const info = phase.info;
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.replace(dashboardPath(info.role));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, dashboardPath]);

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
      if (info.jwtConfigured && info.provider !== "jaas") {
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

  if (phase.kind === "consultation_ended") {
    const { info, reason } = phase;
    const isDoctor = info.role === "moderator";
    const slotDuration = info.durationMinutes || 30;

    return (
      <Shell>
        <div className="relative">
          <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-white mt-4 text-center">
          {reason === "time_expired"
            ? "Consultation Concluded"
            : reason === "doctor_ended"
            ? "Doctor Ended the Consultation"
            : "Consultation Completed"}
        </h1>
        <p className="text-sm text-slate-300 mt-2 max-w-md text-center">
          {reason === "time_expired"
            ? `Your scheduled ${slotDuration}-minute consultation has reached its time limit and the video room is closed.`
            : "This video consultation has ended. Your appointment record has been updated."}
        </p>

        {/* Appointment metadata summary */}
        <div className="mt-6 w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300 space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">Doctor</span>
            <span className="font-semibold text-white">{info.doctorName}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">Patient</span>
            <span className="font-semibold text-white">{info.patientName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Scheduled Duration</span>
            <span className="font-medium text-brand-300">{slotDuration} minutes</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button
            className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-medium"
            onClick={() => window.location.replace(dashboardPath(info.role))}
          >
            Go to {isDoctor ? "Doctor" : "Patient"} Dashboard
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-200"
            onClick={() =>
              window.location.replace(
                isDoctor ? "/doctor/appointments/" : "/patient/appointments/"
              )
            }
          >
            All Appointments
          </Button>
        </div>

        <p className="text-[11px] text-slate-400 mt-4">
          Redirecting automatically in {redirectCountdown}s…
        </p>
      </Shell>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider">Live consultation</span>
          <span className="text-slate-500">
            {phase.info.doctorName} / {phase.info.patientName}
          </span>

          {/* Live countdown timer badge */}
          {secondsRemaining !== null && (
            secondsRemaining > 300 ? (
              <div className="flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 text-xs text-slate-200 shadow-sm">
                <Clock className="h-3.5 w-3.5 text-brand-400" />
                <span className="font-medium">{formatSeconds(secondsRemaining)} remaining</span>
                <span className="text-slate-400 text-[10px]">({phase.info.durationMinutes || 30}m slot)</span>
              </div>
            ) : secondsRemaining > 60 ? (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 text-xs text-amber-300 shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-semibold">{formatSeconds(secondsRemaining)} remaining</span>
                <span className="hidden sm:inline text-amber-300/80 text-[10px]">— Wrap up visit</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 px-2.5 py-1 text-xs text-rose-300 shadow-sm animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span className="font-bold">{formatSeconds(secondsRemaining)} remaining</span>
                <span className="hidden sm:inline text-rose-300 text-[10px]">— Ending automatically</span>
              </div>
            )
          )}

          {!phase.info.jwtConfigured && (
            <span className="hidden sm:inline rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              Demo video host — embedded calls disconnect after 5 minutes. Configure 8x8 JaaS for full sessions.
            </span>
          )}
        </div>
        <Button
          size="sm"
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold h-8"
          onClick={() => {
            void endCallAndLeave(phase.info.role, phase.info.role === "moderator", "manual");
          }}
        >
          <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
          {phase.info.role === "moderator" ? "End consultation" : "Leave"}
        </Button>
      </div>

      {/* 5-minute warning banner */}
      {secondsRemaining !== null && secondsRemaining <= 300 && secondsRemaining > 60 && dismissedWarning !== "5m" && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              5 minutes remaining in your scheduled {phase.info.durationMinutes || 30}-minute consultation. Please begin concluding the visit.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDismissedWarning("5m")}
            className="text-amber-400 hover:text-amber-300 text-xs ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1-minute urgent warning banner */}
      {secondsRemaining !== null && secondsRemaining <= 60 && secondsRemaining > 0 && dismissedWarning !== "1m" && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-1.5 flex items-center justify-between text-xs text-rose-200 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span className="font-semibold">
              Final minute: This room will close automatically when the {phase.info.durationMinutes || 30}-minute slot ends ({secondsRemaining}s remaining).
            </span>
          </div>
        </div>
      )}

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
