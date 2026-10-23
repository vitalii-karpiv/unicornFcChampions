import { type NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/jwt";

const PUBLIC_PATHS = ["/login", "/signup"];

// Cheap gate only: checks the JWT signature/expiry. Revocation (token_version) is checked in getCurrentUser().
export async function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) return NextResponse.next();
  const token = request.cookies.get("session")?.value;
  if (token && (await verifySession(token))) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
