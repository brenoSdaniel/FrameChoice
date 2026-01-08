"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function DashboardGate() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        router.push("/login");
        return;
      }

      const { role } = snap.data();

      if (role === "photographer") {
        router.push("/dashboard/photographer");
      } else {
        router.push("/dashboard/client");
      }
    });

    return () => unsub();
  }, [router]);

  return <p>Carregando...</p>;
}
