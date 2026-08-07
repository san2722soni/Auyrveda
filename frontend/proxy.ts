import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ROLE, AUTH_TOKEN_COOKIE } from "@/lib/auth-constants";

const protectedPaths = [
  "/",
  "/dashboard",
  "/appointments",
  "/users",
  "/conversations",
  "/knowledge",
];

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some(
    (path) =>
      pathname === path || (path !== "/" && pathname.startsWith(`${path}/`))
  );
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  return atob(padded);
}

function hasAdminToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(token.split(".")[1] ?? "")) as {
      role?: string;
      exp?: number;
    };

    return (
      payload.role === ADMIN_ROLE &&
      typeof payload.exp === "number" &&
      payload.exp * 1000 > Date.now()
    );
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const signedIn = hasAdminToken(token);

  if (pathname === "/login" && signedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedPath(pathname) && !signedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);

    response.cookies.delete(AUTH_TOKEN_COOKIE);

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
