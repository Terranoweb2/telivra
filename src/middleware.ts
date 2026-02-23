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
    "/forgot-password",
  ];
  const isPublic =
    pathname === "/" ||
    publicPaths.some((p) => pathname.startsWith(p));

  // Toute page non-publique ou /login /register /forgot-password → rediriger vers /
  if (!sessionCookie) {
    if (pathname === "/login" || pathname === "/register") {
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

  const response = NextResponse.next();

  // Multi-tenant: injecter le slug du tenant dans les headers
  const host = request.headers.get("host") || "";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "";
  if (baseDomain) {
    const hostname = host.split(":")[0];
    if (hostname.endsWith("." + baseDomain)) {
      const slug = hostname.replace("." + baseDomain, "");
      if (slug && !slug.includes(".")) {
        response.headers.set("x-tenant-slug", slug);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|sounds|uploads|icons|sw\\.js|manifest\\.json|socket\\.io).*)"],
};
