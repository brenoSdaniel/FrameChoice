"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./register.module.css";
import { useAlert } from "@/components/AlertContext";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function PhotographerRegister() {
  const { showAlert } = useAlert();
  const router = useRouter(); // ✅ ADICIONADO

  const submittingRef = useRef(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    brandName: "",
    email: "",
    password: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (submittingRef.current) return;
    submittingRef.current = true;

    if (!form.name || !form.brandName || !form.email || !form.password) {
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
        brandName: form.brandName,
        email: form.email,
        role: "photographer",
        createdAt: serverTimestamp(),
      });

      // 3️⃣ EMAIL
      await sendEmailVerification(user);

      // 4️⃣ LOGOUT
      await signOut(auth);

      // 5️⃣ ALERTA + REDIRECT ✅
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
        <p className={styles.subtitle}>Crie sua conta de fotógrafo</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label>Nome completo</label>
            <input name="name" value={form.name} onChange={handleChange} />
          </div>

          <div className={styles.inputGroup}>
            <label>Nome da marca / estúdio</label>
            <input
              name="brandName"
              value={form.brandName}
              onChange={handleChange}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>E-mail</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Senha</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
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
