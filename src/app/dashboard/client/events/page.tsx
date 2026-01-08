"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import styles from "./client-events.module.css";
import BackButton from "@/components/BackButton";

interface Event {
  id: string;
  name: string;
  eventDate: string;
  deliveryDate: string;
  photoCount: number;
  selectionsCount: number;
  maxSelections: number;
  finalPhotosReady: boolean;
}

export default function ClientEventsPage() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // Observa autenticação
  // =========================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // =========================
  // Carrega eventos do cliente
  // =========================
  useEffect(() => {
    if (!user?.email) return;

    const fetchEvents = async () => {
      try {
        const eventsRef = collection(db, "events");
        const q = query(eventsRef, where("clientEmail", "==", user.email));
        const snapshot = await getDocs(q);

        const eventsList: Event[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();

          // Contagem de fotos
          const photosRef = collection(db, "events", docSnap.id, "photos");
          const photosSnap = await getDocs(photosRef);

          // Contagem de seleções (array ou subcoleção)
          let selectionsCount = 0;
          if (Array.isArray(data.selectedPhotos)) {
            selectionsCount = data.selectedPhotos.length;
          } else {
            const selectionsRef = collection(db, "events", docSnap.id, "selections");
            const selectionsSnap = await getDocs(selectionsRef);
            selectionsCount = selectionsSnap.size;
          }

          // Função para formatar datas
          const formatDate = (timestamp: any) => {
            if (!timestamp) return "Não informado";
            const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
          };

          eventsList.push({
            id: docSnap.id,
            name: data.name || "Evento sem nome",
            eventDate: formatDate(data.eventDate),
            deliveryDate: formatDate(data.deliveryDate),
            photoCount: photosSnap.size,
            selectionsCount,
            maxSelections: data.maxSelections || 0,
            finalPhotosReady: !!data.finalPhotosReady,
          });
        }

        // Ordena por data do evento (mais recente primeiro)
        eventsList.sort((a, b) => {
          const dateA = new Date(a.eventDate.split(" ").reverse().join("-"));
          const dateB = new Date(b.eventDate.split(" ").reverse().join("-"));
          return dateB.getTime() - dateA.getTime();
        });

        setEvents(eventsList);
      } catch (err) {
        console.error("Erro ao buscar eventos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  // =========================
  // Função que retorna status e cor do card
  // =========================
  const getStatusInfo = (event: Event) => {
    if (event.finalPhotosReady) return { text: "Fotos finais prontas", color: "green", icon: "✅" };
    if (event.selectionsCount > 0) return { text: "Seleção enviada", color: "purple", icon: "📤" };
    if (event.photoCount > 0) return { text: "Aguardando sua seleção", color: "blue", icon: "⏳" };
    return { text: "Aguardando fotos", color: "gray", icon: "🕐" };
  };

  // =========================
  // Estados de tela
  // =========================
  if (loading) return <p className={styles.loading}>Carregando seus eventos...</p>;
  if (!user) return <p className={styles.error}>Acesso não autorizado.</p>;

  // =========================
  // Render
  // =========================
  return (
    <div className={styles.container}>
      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Meus Eventos</h1>
          <p className={styles.subtitle}>Acompanhe o progresso de todos os seus eventos</p>
        </header>

        {events.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyMessage}>Você ainda não tem eventos cadastrados.</p>
            <p className={styles.emptyHint}>
              Quando o fotógrafo criar um evento para você, ele aparecerá aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {events.map((event) => {
              const status = getStatusInfo(event);

              // =========================
              // Define URL dinamicamente
              // =========================
              let href = `/dashboard/client/events/${event.id}/gallery`;
              if (event.finalPhotosReady) {
                href = `/dashboard/client/downloads`;
              } else if (event.selectionsCount > 0) {
                
              }

              return (
                <Link key={event.id} href={href} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.eventName}>{event.name}</h2>
                    <div className={styles.statusBadge}>
                      <span className={styles.statusIcon}>{status.icon}</span>
                      <span className={styles[status.color]}>{status.text}</span>
                    </div>
                  </div>

                  <div className={styles.eventInfo}>
                    <p>
                      <strong>Data do evento:</strong> {event.eventDate}
                    </p>
                    <p>
                      <strong>Prazo de entrega:</strong> {event.deliveryDate}
                    </p>
                    <p>
                      <strong>Fotos disponíveis:</strong> {event.photoCount}
                    </p>
                    {event.photoCount > 0 && (
                      <p>
                        <strong>Suas escolhas:</strong> {event.selectionsCount} / {event.maxSelections}
                      </p>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.accessText}>
                      {event.finalPhotosReady
                        ? "Baixar fotos finais"
                        : event.selectionsCount > 0
                        ? "Ver seleção enviada"
                        : "Acessar galeria"}{" "}
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
