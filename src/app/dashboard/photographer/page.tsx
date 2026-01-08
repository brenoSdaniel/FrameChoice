"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./home.module.css";

import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  getDoc, // ← IMPORTAÇÃO CORRIGIDA
  doc,     // ← IMPORTAÇÃO CORRIGIDA
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ChartData {
  month: string;
  fotos: number;
}

/* ================= COMPONENTES ================= */

function ActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className={styles.actionCard}>
      <div className={styles.iconCircle}>
        <span className={styles.icon}>{icon}</span>
      </div>
      <div className={styles.actionContent}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className={styles.actionArrow}>→</span>
    </Link>
  );
}

/* ================= DASHBOARD PRINCIPAL ================= */

export default function DashboardHome() {
  const [name, setName] = useState("");
  const [eventsCount, setEventsCount] = useState(0);
  const [selectionsCount, setSelectionsCount] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Nome do fotógrafo
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const fullName = userDoc.data().name || "Fotógrafo";
          setName(fullName);
        }

        // 2. Eventos do fotógrafo
        const eventsQuery = query(
          collection(db, "events"),
          where("photographerId", "==", user.uid)
        );
        const eventsSnap = await getDocs(eventsQuery);

        const eventsCount = eventsSnap.size;
        let selectionsCount = 0;
        let totalPhotos = 0;
        const photosByMonth: Record<string, number> = {};

        for (const eventDoc of eventsSnap.docs) {
          const eventId = eventDoc.id;

          // Contagem de fotos
          const photosSnap = await getDocs(collection(db, "events", eventId, "photos"));
          const photoCount = photosSnap.size;
          totalPhotos += photoCount;

          // Contagem de seleções
          const selectionsSnap = await getDocs(collection(db, "events", eventId, "selections"));
          if (selectionsSnap.size > 0) {
            selectionsCount++;
          }

          // Dados para o gráfico
          photosSnap.docs.forEach((doc) => {
            const data = doc.data();
            if (data.createdAt instanceof Timestamp) {
              const date = data.createdAt.toDate();
              const key = date.toLocaleString("pt-BR", {
                month: "short",
                year: "numeric",
              });
              photosByMonth[key] = (photosByMonth[key] ?? 0) + 1;
            }
          });
        }

        setEventsCount(eventsCount);
        setSelectionsCount(selectionsCount);
        setTotalPhotos(totalPhotos);
        setEstimatedRevenue(selectionsCount * 300); // Ajuste conforme seu pacote

        // Gráfico dos últimos 12 meses
        const chartArray: ChartData[] = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthKey = date.toLocaleString("pt-BR", { month: "short", year: "numeric" });
          chartArray.push({
            month: date.toLocaleString("pt-BR", { month: "short" }).replace(".", ""),
            fotos: photosByMonth[monthKey] || 0,
          });
        }
        setChartData(chartArray);
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return <p className={styles.loading}>Carregando seu dashboard...</p>;
  }

  return (
    <div className={styles.dashboard}>
      {/* HEADER COM DADOS VINCULADOS */}
      <header className={styles.header}>
        <h1>Olá, {name || "Fotógrafo"} 👋</h1>
        <p>Confira seu desempenho e gerencie seus trabalhos</p>

        <div className={styles.topMetrics}>
          <div className={styles.topMetric}>
            <span>Eventos criados</span>
            <strong>{eventsCount}</strong>
          </div>
          <div className={styles.topMetric}>
            <span>Seleções recebidas</span>
            <strong>{selectionsCount}</strong>
          </div>
          <div className={styles.topMetric}>
            <span>Fotos enviadas</span>
            <strong>{totalPhotos.toLocaleString("pt-BR")}</strong>
          </div>
        </div>
      </header>

      {/* GRÁFICO */}
      <section className={styles.chartSection}>
        <h2>Fotos enviadas nos últimos 12 meses</h2>
        <div className={styles.chartContainer}>
          {chartData.every(d => d.fotos === 0) ? (
            <div className={styles.emptyChart}>
              <p>Nenhuma foto enviada nos últimos meses</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" tick={{ fill: "#fff" }} />
                <YAxis tick={{ fill: "#fff" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(30,30,30,0.9)", border: "none", borderRadius: "12px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="fotos" fill="#a78bfa" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* AÇÕES RÁPIDAS */}
      <section className={styles.actions}>
        <ActionCard
          icon="➕"
          title="Novo Evento"
          description="Criar novo evento para cliente"
          href="/dashboard/events/new"
        />
        <ActionCard
          icon="📸"
          title="Enviar Fotos"
          description="Upload de fotos para evento"
          href="/dashboard/upload"
        />
        <ActionCard
          icon="✅"
          title="Seleções Recebidas"
          description="Ver fotos escolhidas pelos clientes"
          href="/dashboard/selections"
        />
        <ActionCard
          icon="🗂️"
          title="Todos os Eventos"
          description="Gerenciar eventos existentes"
          href="/dashboard/events"
        />
        <ActionCard
          icon="👥"
          title="Clientes"
          description="Gerenciar base de clientes"
          href="/dashboard/clients"
        />
      </section>
    </div>
  );
}