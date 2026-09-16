import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy Next.js 16 (ex-Middleware) — contrôle optimiste basé sur la
 * présence du cookie de session Auth.js. La vérification définitive
 * (signature JWT) est faite côté serveur dans le layout `(app)`
 * et via `requireUserId()`.
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

/** Préfixes des routes privées de l'espace connecté. */
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/transactions",
  "/accounts",
  "/budgets",
  "/goals",
  "/analytics",
  "/categories",
  "/notifications",
  "/parametres",
];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = hasSessionCookie(request);

  if (isPrivatePath(pathname) && !loggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/login" || pathname === "/register") && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/accounts/:path*",
    "/budgets/:path*",
    "/goals/:path*",
    "/analytics/:path*",
    "/categories/:path*",
    "/notifications/:path*",
    "/parametres/:path*",
    "/login",
    "/register",
  ],
};
