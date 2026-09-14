import { createHmac, createPrivateKey, createSign, randomUUID } from "node:crypto";

/**
 * Video consultation tokens.
 *
 * Production options (preferred first):
 * 1) 8x8 Jitsi as a Service — JAAS_APP_ID + JAAS_API_KEY_ID + JAAS_PRIVATE_KEY (RS256)
 * 2) Self-hosted Jitsi — JITSI_DOMAIN + JITSI_APP_ID + JITSI_APP_SECRET (HS256)
 *
 * Public meet.jit.si is demo-only: embedded calls disconnect after ~5 minutes.
 * It is used only when JITSI_ALLOW_PUBLIC_FALLBACK=true (or in development).
 */

export const PUBLIC_JITSI_DOMAIN = "meet.jit.si";
export const JAAS_DOMAIN = "8x8.vc";

export type VideoProvider = "jaas" | "self_hosted" | "public";

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function getJaasAppId(): string | null {
  const id = (process.env.JAAS_APP_ID || process.env.JITSI_APP_ID || "").trim();
  if (!id) return null;
  if (id.startsWith("vpaas-magic-cookie-")) return id;
  // Explicit JaaS provider flag with a custom app id
  if ((process.env.JITSI_PROVIDER || "").toLowerCase() === "jaas") return id;
  return null;
}

export function getJaasApiKeyId(): string | null {
  const kid = (process.env.JAAS_API_KEY_ID || process.env.JITSI_API_KEY_ID || "").trim();
  return kid || null;
}

/** Accept PEM, escaped \\n PEM, or base64-encoded PEM. */
export function getJaasPrivateKeyPem(): string | null {
  const raw = (
    process.env.JAAS_PRIVATE_KEY ||
    process.env.JITSI_PRIVATE_KEY ||
    ""
  ).trim();
  if (!raw) return null;

  let pem = raw.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  if (!pem.includes("BEGIN") && /^[A-Za-z0-9+/=\s]+$/.test(pem)) {
    try {
      pem = Buffer.from(pem.replace(/\s+/g, ""), "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  if (!pem.includes("BEGIN")) return null;
  return pem;
}

export function isJaasConfigured(): boolean {
  return Boolean(getJaasAppId() && getJaasApiKeyId() && getJaasPrivateKeyPem());
}

export function getJitsiDomain(): string {
  const raw =
    process.env.JITSI_DOMAIN ||
    process.env.NEXT_PUBLIC_JITSI_DOMAIN ||
    PUBLIC_JITSI_DOMAIN;
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Deterministic, non-guessable room name for an appointment.
 * HMAC keyed with a server secret so nobody can derive it from the id alone.
 */
export function buildRoomName(appointmentId: string): string {
  const secret =
    process.env.JITSI_ROOM_SECRET ||
    process.env.JITSI_APP_SECRET ||
    process.env.JAAS_APP_ID ||
    process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return `ss-${appointmentId}`;
  }
  const digest = createHmac("sha256", secret)
    .update(appointmentId)
    .digest("hex");
  return `ss-${appointmentId.slice(0, 8)}-${digest.slice(0, 20)}`;
}

/** Path passed to JitsiMeetExternalAPI.roomName (may include JaaS tenant). */
export function buildRoomPath(room: string, provider: VideoProvider = resolveVideoProvider()): string {
  if (provider === "jaas") {
    const appId = getJaasAppId();
    if (!appId) return room;
    if (room.startsWith(`${appId}/`)) return room;
    return `${appId}/${room}`;
  }
  return room;
}

export function getExternalApiScriptUrl(provider: VideoProvider = resolveVideoProvider()): string {
  if (provider === "jaas") {
    const appId = getJaasAppId();
    // Tenant-scoped script matches 8x8 console samples and avoids public meet.jit.si.
    return appId
      ? `https://${JAAS_DOMAIN}/${appId}/external_api.js`
      : `https://${JAAS_DOMAIN}/external_api.js`;
  }
  if (provider === "self_hosted") {
    return `https://${getJitsiDomain()}/external_api.js`;
  }
  return `https://${PUBLIC_JITSI_DOMAIN}/external_api.js`;
}

export function isJitsiJwtConfigured(): boolean {
  return isJaasConfigured() || Boolean(process.env.JITSI_APP_ID && process.env.JITSI_APP_SECRET);
}

/** Production-safe free deployment: custom domain + Prosody HS256 secret. */
export function isSelfHostedJitsiConfigured(): boolean {
  if (isJaasConfigured()) return false;
  const domain = getJitsiDomain();
  return Boolean(
    domain !== PUBLIC_JITSI_DOMAIN &&
      domain !== JAAS_DOMAIN &&
      process.env.JITSI_APP_ID &&
      process.env.JITSI_APP_SECRET &&
      !String(process.env.JITSI_APP_ID).startsWith("vpaas-magic-cookie-")
  );
}

export function allowPublicJitsiFallback(): boolean {
  if (process.env.JITSI_ALLOW_PUBLIC_FALLBACK === "true") return true;
  if (process.env.JITSI_ALLOW_PUBLIC_FALLBACK === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function resolveVideoProvider(): VideoProvider {
  if (isJaasConfigured()) return "jaas";
  if (isSelfHostedJitsiConfigured()) return "self_hosted";
  return "public";
}

/**
 * Token must last the whole consultation. A 15-minute cap expired mid-call and
 * Jitsi then showed its own login screen.
 */
export function consultationJwtExpiryUnix(params: {
  nowMs: number;
  windowClosesMs: number;
  isAdmin: boolean;
}): number {
  const now = params.nowMs;
  const afterCallGraceMs = 45 * 60_000;
  const minTtlMs = 20 * 60_000;
  const maxTtlMs = 4 * 60 * 60_000;
  const target = params.isAdmin
    ? now + 2 * 60 * 60_000
    : params.windowClosesMs + afterCallGraceMs;
  const clamped = Math.min(Math.max(target, now + minTtlMs), now + maxTtlMs);
  return Math.floor(clamped / 1000);
}

export interface JitsiTokenInput {
  room: string;
  userId: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  moderator: boolean;
  /** Unix seconds. */
  expiresAt: number;
}

function signHs256Jwt(input: JitsiTokenInput): string | null {
  const appId = process.env.JITSI_APP_ID;
  const appSecret = process.env.JITSI_APP_SECRET;
  if (!appId || !appSecret) return null;

  const iat = Math.floor(Date.now() / 1000);
  const nbf = iat - 10;
  const user = {
    id: input.userId,
    name: input.displayName,
    ...(input.email ? { email: input.email } : {}),
    ...(input.avatarUrl ? { avatar: input.avatarUrl } : {}),
    moderator: input.moderator,
    affiliation: input.moderator ? "owner" : "member",
  };

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    aud: appId,
    iss: appId,
    sub: getJitsiDomain(),
    room: input.room,
    jti: randomUUID(),
    iat,
    nbf,
    exp: input.expiresAt,
    moderator: input.moderator,
    context: {
      user,
      moderator: input.moderator,
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        "outbound-call": false,
      },
    },
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = createHmac("sha256", appSecret).update(signingInput).digest();
  return `${signingInput}.${b64url(signature)}`;
}

function signJaasJwt(input: JitsiTokenInput): string | null {
  const appId = getJaasAppId();
  const kid = getJaasApiKeyId();
  const pem = getJaasPrivateKeyPem();
  if (!appId || !kid || !pem) return null;

  const iat = Math.floor(Date.now() / 1000);
  const nbf = iat - 10;
  // JWT room claim is the conference name WITHOUT the AppID tenant prefix.
  const roomClaim = input.room.includes("/")
    ? input.room.slice(input.room.indexOf("/") + 1)
    : input.room;

  const header = { alg: "RS256", typ: "JWT", kid };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    iat,
    nbf,
    exp: input.expiresAt,
    sub: appId,
    room: roomClaim,
    context: {
      user: {
        id: input.userId,
        name: input.displayName,
        ...(input.email ? { email: input.email } : {}),
        ...(input.avatarUrl ? { avatar: input.avatarUrl } : {}),
        // JaaS requires string booleans for moderator.
        moderator: input.moderator ? "true" : "false",
      },
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        "outbound-call": false,
      },
    },
  };

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = createPrivateKey(pem);
  const signature = createSign("RSA-SHA256").update(signingInput).end().sign(key);
  return `${signingInput}.${b64url(signature)}`;
}

/**
 * Signs a meeting JWT so doctor/patient roles are decided server-side
 * and neither party sees a Jitsi login prompt.
 */
export function signJitsiJwt(input: JitsiTokenInput): string | null {
  const provider = resolveVideoProvider();
  if (provider === "jaas") return signJaasJwt(input);
  if (provider === "self_hosted") return signHs256Jwt(input);
  return null;
}

export function getVideoJoinConfig(room: string): {
  provider: VideoProvider;
  domain: string;
  room: string;
  scriptUrl: string;
  jwtConfigured: boolean;
} {
  const provider = resolveVideoProvider();
  if (provider === "jaas") {
    return {
      provider,
      domain: JAAS_DOMAIN,
      room: buildRoomPath(room, "jaas"),
      scriptUrl: getExternalApiScriptUrl("jaas"),
      jwtConfigured: true,
    };
  }
  if (provider === "self_hosted") {
    return {
      provider,
      domain: getJitsiDomain(),
      room: buildRoomPath(room, "self_hosted"),
      scriptUrl: getExternalApiScriptUrl("self_hosted"),
      jwtConfigured: true,
    };
  }
  return {
    provider,
    domain: PUBLIC_JITSI_DOMAIN,
    room: buildRoomPath(room, "public"),
    scriptUrl: getExternalApiScriptUrl("public"),
    jwtConfigured: false,
  };
}
