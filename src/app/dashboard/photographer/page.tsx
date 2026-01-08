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
  getDoc,
  doc,
  updateDoc,
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

export default function DashboardHome() {
  const [name, setName] = useState("");
  const [eventsCount, setEventsCount] = useState(0);
  const [selectionsCount, setSelectionsCount] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  // Tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Nome e primeiro login
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const fullName = data.name || "Fotógrafo";
          setName(fullName);

          // Primeiro login?
          if (data.firstLogin === undefined || data.firstLogin === true) {
            setIsFirstLogin(true);
            setShowTutorial(true);
            // Marca como já visto
            await updateDoc(doc(db, "users", user.uid), { firstLogin: false });
          }
        }

        // Eventos e métricas
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

          const photosSnap = await getDocs(collection(db, "events", eventId, "photos"));
          const photoCount = photosSnap.size;
          totalPhotos += photoCount;

          const selectionsSnap = await getDocs(collection(db, "events", eventId, "selections"));
          if (selectionsSnap.size > 0) {
            selectionsCount++;
          }

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
      {/* HEADER */}
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

      {/* ÍCONE FLUTUANTE DO TUTORIAL (aparece depois do primeiro acesso) */}
      {!isFirstLogin && (
        <button
          onClick={() => setShowTutorial(true)}
          className={styles.helpButton}
          aria-label="Abrir tutorial"
        >
          ?
        </button>
      )}

      {/* MODAL DO TUTORIAL */}
      {showTutorial && (
        <>
          <div className={styles.overlay} onClick={() => setShowTutorial(false)} />
          <div className={styles.tutorialModal}>
            <div className={styles.tutorialHeader}>
              <h3>Bem-vindo ao FrameChoice, {name || "Fotógrafo"}!</h3>
              <button onClick={() => setShowTutorial(false)} className={styles.closeButton}>
                ×
              </button>
            </div>

            <div className={styles.tutorialContent}>
              <p className={styles.intro}>
                Aqui está um tutorial completo para você usar a plataforma da melhor forma possível. Vamos passo a passo!
              </p>

              <div className={styles.step}>
                <div className={styles.stepIcon}>1️⃣</div>
                <div className={styles.stepText}>
                  <h4>Criar um Evento</h4>
                  <p>Clique em "Novo Evento". Preencha o nome do evento, email do cliente, data do evento, prazo de entrega e limite de fotos (ex: 30).</p>
                  <p>O cliente recebe acesso automático à galeria exclusiva.</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepIcon}>2️⃣</div>
                <div className={styles.stepText}>
                  <h4>Enviar Fotos</h4>
                  <p>Acesse o evento e clique em "Enviar Fotos". Selecione múltiplas fotos e envie — o progresso aparece em tempo real.</p>
                  <p>As fotos ficam com marca d'água para proteger seu trabalho.</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepIcon}>3️⃣</div>
                <div className={styles.stepText}>
                  <h4>Cliente Escolhe as Fotos</h4>
                  <p>O cliente acessa a galeria, seleciona exatamente o número permitido e confirma.</p>
                  <p>Você recebe notificação automática em "Seleções Recebidas".</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepIcon}>4️⃣</div>
                <div className={styles.stepText}>
                  <h4>Entregar Fotos Finais</h4>
                  <p>Edite as fotos selecionadas e envie as finais pelo evento.</p>
                  <p>O cliente recebe acesso para download. Fotos expiram em 90 dias para economizar espaço.</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepIcon}>5️⃣</div>
                <div className={styles.stepText}>
                  <h4>Outras Funcionalidades</h4>
                  <ul>
                    <li><strong>Todos os Eventos</strong>: Gerencie todos os eventos criados</li>
                    <li><strong>Clientes</strong>: Veja e organize sua base de clientes</li>
                    <li><strong>Gráfico</strong>: Acompanhe seu volume de fotos ao longo do tempo</li>
                    <li><strong>Ícone ?</strong>: Abra este tutorial a qualquer momento</li>
                  </ul>
                </div>
              </div>

              <p className={styles.finalTip}>
                Dica final: comece criando um evento teste com seu próprio email para ver como o cliente recebe!
              </p>
            </div>

            <button onClick={() => setShowTutorial(false)} className={styles.okButton}>
              Entendi, vamos começar!
            </button>
          </div>
        </>
      )}
    </div>
  );
}