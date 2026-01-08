"use client";

import { useRouter } from "next/navigation";
import styles from "./BackButton.module.css";

interface BackButtonProps {
  label?: string;
}

export default function BackButton({ label = "Voltar" }: BackButtonProps) {
  const router = useRouter();

  return (
    <button className={styles.button} onClick={() => router.back()}>
      <span className={styles.icon}>←</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}