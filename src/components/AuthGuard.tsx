"use client";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user || !user.emailVerified) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) return null;

  return <>{children}</>;
}
