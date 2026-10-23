import { jwtVerify, SignJWT } from "jose";

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export type SessionPayload = { sub: string; ver: number; iat: number };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signSession(p: { sub: string; ver: number }): Promise<string> {
  return new SignJWT({ ver: p.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.ver !== "number" || typeof payload.iat !== "number") {
      return null;
    }
    return { sub: payload.sub, ver: payload.ver, iat: payload.iat };
  } catch {
    return null;
  }
}
