import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export async function middleware(req: NextRequest) {
  const uid = req.cookies.get("uid")?.value;
  const { pathname } = req.nextUrl;

  // 🔓 Rotas públicas
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return NextResponse.next();
  }

  // ❌ Não logado
  if (!uid) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const user = userDoc.data();

    // ❌ Role inválida
    if (!user?.role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // 🔁 REDIRECIONAMENTO POR ROLE
    if (user.role === "photographer" && pathname.startsWith("/client")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (user.role === "client" && pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/client", req.url));
    }

    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/client/:path*"],
};
