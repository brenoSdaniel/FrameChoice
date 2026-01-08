"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import styles from "./client-dashboard.module.css";

export default function ClientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair da sua conta?")) {
      await signOut(auth);
      window.location.href = "/login";
    }
  };

  if (loading) {
    return <p className={styles.loading}>Carregando sua área...</p>;
  }

  if (!user) {
    return <p className={styles.error}>Acesso não autorizado.</p>;
  }

  const cards = [
    { href: "/dashboard/client/events", icon: "📸", title: "Meus Eventos", desc: "Acesse todos os seus eventos e galerias" },
    { href: "/dashboard/client/gallery", icon: "🖼️", title: "Selecionar Fotos", desc: "Escolha suas fotos favoritas do evento" },
    { href: "/dashboard/client/downloads", icon: "⬇️", title: "Downloads", desc: "Baixe suas fotos editadas em alta qualidade" },
    { href: "/dashboard/client/profile", icon: "👤", title: "Meu Perfil", desc: "Atualize seu nome, telefone e preferências" },
  ];

  return (
    <div className={styles.container}>
      {/* Botão Sair fixo no topo direito */}
      <button onClick={handleLogout} className={styles.logoutButton}>
        Sair da conta
      </button>

      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>FrameChoice</h1>
        </div>
        <div className={styles.greeting}>
          <h2>Olá, {user.displayName || "Cliente"} 👋</h2>
          <p>Gerencie suas fotos e eventos com facilidade</p>
        </div>
      </header>

      <main className={styles.grid}>
        {cards.map((card, index) => (
          <Link
            key={index}
            href={card.href}
            className={`${styles.card} ${
              index === cards.length - 1 && cards.length % 2 !== 0
                ? styles.mobileCenterLastCard
                : ""
            }`}
          >
            <div className={styles.icon}>{card.icon}</div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </Link>
        ))}
      </main>

      {/* Botão de Ajuda flutuante */}
      <button
        onClick={() => setShowHelp(true)}
        className={styles.helpButton}
        aria-label="Ajuda"
      >
        ?
      </button>

      {/* MODAL DE AJUDA CENTRALIZADO E GRANDE */}
      {showHelp && (
        <>
          <div className={styles.overlay} onClick={() => setShowHelp(false)} />
          <div className={styles.helpModal}>
            <div className={styles.helpHeader}>
              <h3>Como usar o FrameChoice</h3>
              <button onClick={() => setShowHelp(false)} className={styles.closeHelp}>
                ×
              </button>
            </div>
            <div className={styles.helpContent}>
              <ul>
                <li><strong>Meus Eventos:</strong> Veja todos os eventos que o fotógrafo criou para você</li>
                <li><strong>Selecionar Fotos:</strong> Escolha suas fotos favoritas dentro do limite do pacote</li>
                <li><strong>Downloads:</strong> Baixe as fotos finais editadas pelo fotógrafo em alta qualidade</li>
                <li><strong>Meu Perfil:</strong> Atualize seu nome, telefone e preferências</li>
              </ul>
              <p className={styles.helpTip}>
                💡 Dica: O fotógrafo será notificado assim que você finalizar a seleção!
              </p>
            </div>
            <button onClick={() => setShowHelp(false)} className={styles.helpCloseButton}>
              Entendi, obrigado!
            </button>
          </div>
        </>
      )}
    </div>
  );
}