import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { after, before, describe, it } from "node:test";
import {
  buildRoomPath,
  consultationJwtExpiryUnix,
  getVideoJoinConfig,
  isJaasConfigured,
  isSelfHostedJitsiConfigured,
  resolveVideoProvider,
  signJitsiJwt,
} from "./jwt.ts";

const original = {
  domain: process.env.JITSI_DOMAIN,
  appId: process.env.JITSI_APP_ID,
  appSecret: process.env.JITSI_APP_SECRET,
  provider: process.env.JITSI_PROVIDER,
  jaasAppId: process.env.JAAS_APP_ID,
  jaasKid: process.env.JAAS_API_KEY_ID,
  jaasKey: process.env.JAAS_PRIVATE_KEY,
  allowPublic: process.env.JITSI_ALLOW_PUBLIC_FALLBACK,
  nodeEnv: process.env.NODE_ENV,
};

function clearVideoEnv() {
  delete process.env.JITSI_DOMAIN;
  delete process.env.JITSI_APP_ID;
  delete process.env.JITSI_APP_SECRET;
  delete process.env.JITSI_PROVIDER;
  delete process.env.JAAS_APP_ID;
  delete process.env.JAAS_API_KEY_ID;
  delete process.env.JAAS_PRIVATE_KEY;
  delete process.env.JITSI_API_KEY_ID;
  delete process.env.JITSI_PRIVATE_KEY;
  delete process.env.JITSI_ALLOW_PUBLIC_FALLBACK;
}

after(() => {
  clearVideoEnv();
  if (original.domain === undefined) delete process.env.JITSI_DOMAIN;
  else process.env.JITSI_DOMAIN = original.domain;
  if (original.appId === undefined) delete process.env.JITSI_APP_ID;
  else process.env.JITSI_APP_ID = original.appId;
  if (original.appSecret === undefined) delete process.env.JITSI_APP_SECRET;
  else process.env.JITSI_APP_SECRET = original.appSecret;
  if (original.provider === undefined) delete process.env.JITSI_PROVIDER;
  else process.env.JITSI_PROVIDER = original.provider;
  if (original.jaasAppId === undefined) delete process.env.JAAS_APP_ID;
  else process.env.JAAS_APP_ID = original.jaasAppId;
  if (original.jaasKid === undefined) delete process.env.JAAS_API_KEY_ID;
  else process.env.JAAS_API_KEY_ID = original.jaasKid;
  if (original.jaasKey === undefined) delete process.env.JAAS_PRIVATE_KEY;
  else process.env.JAAS_PRIVATE_KEY = original.jaasKey;
  if (original.allowPublic === undefined) delete process.env.JITSI_ALLOW_PUBLIC_FALLBACK;
  else process.env.JITSI_ALLOW_PUBLIC_FALLBACK = original.allowPublic;
  if (original.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = original.nodeEnv;
});

describe("self-hosted Jitsi JWT", () => {
  before(() => {
    clearVideoEnv();
    process.env.JITSI_DOMAIN = "meet.example.com";
    process.env.JITSI_APP_ID = "stress-saviour";
    process.env.JITSI_APP_SECRET = "test-secret-that-is-long-enough-for-hs256";
  });

  it("detects a complete self-hosted configuration", () => {
    assert.equal(isSelfHostedJitsiConfigured(), true);
    assert.equal(resolveVideoProvider(), "self_hosted");
  });

  it("signs doctor identity, room, role, and expiry with HS256", () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 900;
    const token = signJitsiJwt({
      room: "ss-test-room",
      userId: "doctor-id",
      displayName: "Dr. Test",
      email: "doctor@example.com",
      moderator: true,
      expiresAt,
    });

    assert.ok(token);
    const [headerPart, payloadPart, signature] = token.split(".");
    const header = JSON.parse(
      Buffer.from(headerPart, "base64url").toString("utf8")
    );
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8")
    );
    const expectedSignature = createHmac(
      "sha256",
      process.env.JITSI_APP_SECRET!
    )
      .update(`${headerPart}.${payloadPart}`)
      .digest("base64url");

    assert.equal(header.alg, "HS256");
    assert.equal(payload.aud, "stress-saviour");
    assert.equal(payload.iss, "stress-saviour");
    assert.equal(payload.sub, "meet.example.com");
    assert.equal(payload.room, "ss-test-room");
    assert.equal(payload.exp, expiresAt);
    assert.equal(payload.moderator, true);
    assert.equal(payload.context.user.id, "doctor-id");
    assert.equal(payload.context.user.moderator, true);
    assert.equal(payload.context.user.affiliation, "owner");
    assert.ok(payload.jti);
    assert.equal(signature, expectedSignature);
  });

  it("keeps the token valid through the consultation instead of 15 minutes", () => {
    const now = Date.parse("2026-09-07T10:00:00.000Z");
    const windowCloses = Date.parse("2026-09-07T10:30:00.000Z");
    const exp = consultationJwtExpiryUnix({
      nowMs: now,
      windowClosesMs: windowCloses,
      isAdmin: false,
    });
    assert.ok(exp * 1000 >= windowCloses + 40 * 60_000);
    assert.ok(exp * 1000 <= now + 4 * 60 * 60_000);
  });
});

describe("8x8 JaaS JWT", () => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  before(() => {
    clearVideoEnv();
    process.env.JAAS_APP_ID = "vpaas-magic-cookie-testdemoappid0001";
    process.env.JAAS_API_KEY_ID = "vpaas-magic-cookie-testdemoappid0001/key1";
    process.env.JAAS_PRIVATE_KEY = privateKey;
  });

  it("detects JaaS configuration and prefixes room with AppID", () => {
    assert.equal(isJaasConfigured(), true);
    assert.equal(resolveVideoProvider(), "jaas");
    assert.equal(
      buildRoomPath("ss-room-1", "jaas"),
      "vpaas-magic-cookie-testdemoappid0001/ss-room-1"
    );
    const join = getVideoJoinConfig("ss-room-1");
    assert.equal(join.domain, "8x8.vc");
    assert.equal(join.jwtConfigured, true);
    assert.match(join.scriptUrl, /8x8\.vc\/vpaas-magic-cookie/);
  });

  it("signs RS256 tokens with chat/jitsi claims and string moderator", () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 1800;
    const token = signJitsiJwt({
      room: "vpaas-magic-cookie-testdemoappid0001/ss-room-1",
      userId: "doctor-id",
      displayName: "Dr. Laila",
      email: "doctor@example.com",
      moderator: true,
      expiresAt,
    });
    assert.ok(token);
    const [headerPart, payloadPart] = token.split(".");
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    assert.equal(header.alg, "RS256");
    assert.equal(header.kid, "vpaas-magic-cookie-testdemoappid0001/key1");
    assert.equal(payload.aud, "jitsi");
    assert.equal(payload.iss, "chat");
    assert.equal(payload.sub, "vpaas-magic-cookie-testdemoappid0001");
    assert.equal(payload.room, "ss-room-1");
    assert.equal(payload.context.user.moderator, "true");
  });
});
