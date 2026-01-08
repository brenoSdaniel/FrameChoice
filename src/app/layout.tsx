// app/layout.tsx
import type { Metadata } from "next";
import { GeistSans, GeistMono } from "geist/font"; // ← Import correto
import "./globals.css";

import { AlertProvider } from "@/components/AlertContext";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "FrameChoice",
  description: "Seleção inteligente de fotos para fotógrafos e clientes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* 👇 RESOLVE O PROBLEMA NO CELULAR 👇 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <AlertProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AlertProvider>
      </body>
    </html>
  );
}