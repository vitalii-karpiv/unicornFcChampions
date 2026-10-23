import { beforeAll, describe, expect, test } from "vitest";
import { signSession, verifySession } from "@/lib/auth/jwt";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123";
});

describe("session jwt", () => {
  test("round-trips sub and ver", async () => {
    const token = await signSession({ sub: "user-1", ver: 3 });
    const payload = await verifySession(token);
    expect(payload).toMatchObject({ sub: "user-1", ver: 3 });
    expect(typeof payload!.iat).toBe("number");
  });

  test("tampered token is rejected", async () => {
    const token = await signSession({ sub: "user-1", ver: 0 });
    const [h, p, s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "user-2", ver: 0 })).toString("base64url");
    expect(await verifySession(`${h}.${forged}.${s}`)).toBeNull();
    expect(await verifySession(`${h}.${p}.${s.slice(0, -2)}xx`)).toBeNull();
  });

  test("garbage is rejected", async () => {
    expect(await verifySession("not-a-jwt")).toBeNull();
    expect(await verifySession("")).toBeNull();
  });
});
