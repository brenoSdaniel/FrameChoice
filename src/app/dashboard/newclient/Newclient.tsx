"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./newclientadd.module.css";
import { useAlert } from "@/components/AlertContext";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function ClientRegister() {
  const { showAlert } = useAlert();
  const router = useRouter();

  const submittingRef = useRef(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "", // ✅ novo campo telefone
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (submittingRef.current) return;
    submittingRef.current = true;

    if (!form.name || !form.email || !form.password || !form.phone) {
      showAlert("error", "Preencha todos os campos");
      submittingRef.current = false;
      return;
    }

    if (!form.email.includes("@")) {
      showAlert("warning", "Informe um e-mail válido");
      submittingRef.current = false;
      return;
    }

    if (form.password.length < 6) {
      showAlert("warning", "A senha deve ter pelo menos 6 caracteres");
      submittingRef.current = false;
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ AUTH
      const { user } = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // 2️⃣ FIRESTORE
      await setDoc(doc(db, "users", user.uid), {
        name: form.name,
        email: form.email,
        phone: form.phone, // ✅ adiciona telefone no Firestore
        role: "client",
        createdAt: serverTimestamp(),
      });

      // 3️⃣ EMAIL
      await sendEmailVerification(user);

      // 4️⃣ LOGOUT
      await signOut(auth);

      // 5️⃣ ALERTA + REDIRECT
      showAlert(
        "success",
        "Conta criada com sucesso! Verifique seu e-mail (inclusive a caixa de spam) antes de entrar."
      );

      router.push("/login");
    } catch (error: any) {
      let message = "Erro ao criar conta";

      if (error.code === "auth/email-already-in-use") {
        message = "Este e-mail já está em uso";
      } else if (error.code === "auth/invalid-email") {
        message = "E-mail inválido";
      } else if (error.code === "auth/weak-password") {
        message = "Senha muito fraca";
      }

      showAlert("error", message);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Criar conta</h1>
        <p className={styles.subtitle}>Crie sua conta de cliente</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label>Nome completo</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>E-mail</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Telefone</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Senha</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <p style={{ marginTop: 5, textAlign: "center" }}>
            Já tem conta? <a href="/login">Entrar</a>
          </p>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
      </div>
    </main>
  );
}
