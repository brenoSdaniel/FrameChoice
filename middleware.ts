import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// === CREDENCIAIS DO FIREBASE ADMIN (para server-side) ===
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Inicializa o Firebase Admin apenas se as credenciais existirem
let db;

try {
  if (!getApps().length && serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  db = getFirestore();
} catch (error) {
  console.error("Erro ao inicializar Firebase Admin:", error);
  db = null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const uid = req.cookies.get("uid")?.value;

  // 🔓 Rotas públicas (login, register, assets estáticos, api, etc.)
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

  // ❌ Não logado → redireciona pra login
  if (!uid) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Se o Firebase Admin não inicializou, redireciona pra login por segurança
  if (!db) {
    console.error("Firebase Admin não inicializado no middleware");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const userDoc = await db.doc(`users/${uid}`).get();

    if (!userDoc.exists) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const user = userDoc.data();

    if (!user?.role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // 🔀 Redirecionamento por role
    if (user.role === "photographer" && pathname.startsWith("/client")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (user.role === "client" && pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/client")) {
      return NextResponse.redirect(new URL("/dashboard/client", req.url));
    }

    // Tudo ok → continua
    return NextResponse.next();
  } catch (error) {
    console.error("Erro no middleware de autenticação:", error);
    // Em caso de erro, redireciona pra login (evita 500)
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/client/:path*",
  ],
};