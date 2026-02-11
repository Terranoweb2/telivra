import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  const { pathname } = request.nextUrl;

  const publicPaths = ["/login", "/register", "/api/auth", "/api/tracking"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!sessionCookie && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionCookie && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
