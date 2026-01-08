// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const uid = req.cookies.get("uid")?.value;

  // Rotas públicas
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Rotas protegidas
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/client")) {
    if (!uid) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Deixa passar (a verificação de role e usuário válido fazemos nas páginas)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/client/:path*",
  ],
};