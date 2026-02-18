import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  const { pathname } = request.nextUrl;

  const publicPaths = [
    "/api/auth",
    "/api/tracking",
    "/api/products",
    "/api/orders/guest",
    "/api/orders/track",
    "/api/payments/callback",
    "/api/payments/webhook",
    "/api/settings",
    "/api/promotions",
    "/api/geocode",
    "/api/messages", "/api/upload/chat",
    "/api/push/vapid",
    "/api/birthdays/check",
    "/api/loyalty/check",
    "/track",
  ];
  const isPublic =
    pathname === "/" ||
    publicPaths.some((p) => pathname.startsWith(p));

  // Toute page non-publique ou /login /register /forgot-password → rediriger vers /
  if (!sessionCookie) {
    if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (!isPublic) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Utilisateur connecté sur / → dashboard
  if (sessionCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|sounds|uploads|icons|sw\\.js|manifest\\.json|socket\\.io).*)"],
};
