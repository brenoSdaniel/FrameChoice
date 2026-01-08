import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.logo}>FrameChoice</h1>

        <p className={styles.tagline}>
          Escolhas simples para clientes.<br />
          Controle total para fotógrafos.
        </p>

        <div className={styles.actions}>
          <Link href="/register/photographer" className={styles.primary}>
            Sou Fotógrafo
          </Link>

          <Link href="/register/client" className={styles.secondary}>
            Sou Cliente
          </Link>
          <p style={{ marginTop: 20 }}>
  Já tem conta? <a href="/login">Entrar</a>
</p>

        </div>
      </div>
    </main>
  );
}
