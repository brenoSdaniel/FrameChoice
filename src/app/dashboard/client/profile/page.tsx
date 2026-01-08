"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import styles from "./profile.module.css";
import BackButton from "@/components/BackButton";

type ProfileData = {
  name: string;
  phone: string;
  email: string;
  createdAt?: any;
};

export default function ClientProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            name: data.name || "",
            phone: data.phone || "",
            email: user.email,
            createdAt: data.createdAt,
          });
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setSuccess(false);

    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        name: profile.name,
        phone: profile.phone,
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      alert("Erro ao salvar informações.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <p className={styles.center}>Carregando autenticação...</p>;
  if (loading) return <p className={styles.center}>Carregando perfil...</p>;

  return (
    <div className={styles.container}>
        <div className={styles.header}>
  <div className={styles.back}>
    <BackButton />
  </div>

  <h1 className={styles.title}>Meu Perfil</h1>
</div>

      <p className={styles.subtitle}>
        Atualize suas informações pessoais
      </p>

      <div className={styles.card}>
        <div className={styles.field}>
          <label>Nome</label>
          <input
            type="text"
            name="name"
            value={profile.name}
            onChange={handleChange}
            placeholder="Seu nome completo"
          />
        </div>

        <div className={styles.field}>
          <label>Telefone</label>
          <input
            type="tel"
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            placeholder="(99) 99999-9999"
          />
        </div>

        <div className={styles.field}>
          <label>Email</label>
          <input
            type="email"
            value={profile.email}
            disabled
          />
        </div>

        <button
          className={styles.saveButton}
          onClick={saveProfile}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>

        {success && (
          <p className={styles.success}>
            ✅ Perfil atualizado com sucesso!
          </p>
        )}
      </div>
    </div>
  );
}
