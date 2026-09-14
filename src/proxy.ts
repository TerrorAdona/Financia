import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy Next.js 16 (ex-Middleware) — contrôle optimiste basé sur la
 * présence du cookie de session Auth.js. La vérification définitive
 * (signature JWT) est faite côté serveur via `auth()` dans le layout
 * `/dashboard` et `requireUserId()`.
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = hasSessionCookie(request);

  if (pathname.startsWith("/dashboard") && !loggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/login" || pathname === "/register") && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
