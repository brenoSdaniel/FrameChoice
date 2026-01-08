"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { useAlert } from "@/components/AlertContext";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function LoginPage() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.email || !form.password) {
      showAlert("error", "Preencha e-mail e senha");
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ AUTH
      const { user } = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // 2️⃣ EMAIL VERIFICADO?
      if (!user.emailVerified) {
        await signOut(auth);

        showAlert(
          "warning",
          "Verifique seu e-mail para continuar. Confira também a caixa de SPAM."
        );
        return;
      }

      // 3️⃣ FIRESTORE
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        await signOut(auth);
        showAlert("error", "Usuário não encontrado no sistema");
        return;
      }

      const userData = userDoc.data();

      // 4️⃣ COOKIE PARA MIDDLEWARE 🍪
      document.cookie = `uid=${user.uid}; path=/`;

      // 5️⃣ REDIRECIONAMENTO POR ROLE
      if (userData.role === "photographer") {
        router.push("/dashboard");
      } else {
        router.push("/dashboard/client");
      }

    } catch {
      showAlert("error", "E-mail ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Entrar</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            name="email"
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
          />

          <input
            name="password"
            type="password"
            placeholder="Senha"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
          />

          <button disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
