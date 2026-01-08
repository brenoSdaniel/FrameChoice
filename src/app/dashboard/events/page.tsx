"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import styles from "./events.module.css";
import BackButton from "@/components/BackButton";

interface Event {
  id: string;
  name: string;
  client: string;
  eventDate: string;
  deliveryDate: string;
  selectedCount: number;
  maxSelections: number;
  selectionsSubmitted: boolean;
  finalPhotosReady: boolean;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const user = auth.currentUser;
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const eventsRef = collection(db, "events");
        const q = query(
          eventsRef,
          where("photographerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const eventsList: Event[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();

          // Contagem de fotos selecionadas
          let selectedCount = 0;
          if (Array.isArray(data.selectedPhotos)) {
            selectedCount = data.selectedPhotos.length;
          } else {
            const selectionsRef = collection(db, "events", docSnap.id, "selections");
            const selectionsSnap = await getDocs(selectionsRef);
            selectedCount = selectionsSnap.size;
          }

          // Datas formatadas
          let eventDate = "Não informado";
          if (data.eventDate) {
            if (data.eventDate instanceof Timestamp) {
              eventDate = data.eventDate.toDate().toLocaleDateString("pt-BR");
            } else if (typeof data.eventDate === "string") {
              eventDate = new Date(data.eventDate).toLocaleDateString("pt-BR");
            }
          }

          let deliveryDate = "Não informado";
          if (data.deliveryDate) {
            if (data.deliveryDate instanceof Timestamp) {
              deliveryDate = data.deliveryDate.toDate().toLocaleDateString("pt-BR");
            } else if (typeof data.deliveryDate === "string") {
              deliveryDate = new Date(data.deliveryDate).toLocaleDateString("pt-BR");
            }
          }

          eventsList.push({
            id: docSnap.id,
            name: data.name || "Evento sem nome",
            client: data.client || "Cliente não informado",
            eventDate,
            deliveryDate,
            selectedCount,
            maxSelections: data.maxSelections || 0,
            selectionsSubmitted: selectedCount > 0 || !!data.selectionsSubmitted,
            finalPhotosReady: !!data.finalPhotosReady,
          });
        }

        // Ordena: eventos com seleção primeiro
        eventsList.sort((a, b) => {
          if (a.selectionsSubmitted && !b.selectionsSubmitted) return -1;
          if (!a.selectionsSubmitted && b.selectionsSubmitted) return 1;
          return 0;
        });

        setEvents(eventsList);
      } catch (err) {
        console.error("Erro ao carregar eventos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getStatus = (event: Event) => {
    if (event.finalPhotosReady) {
      return { text: "Fotos entregues", icon: "✅", color: "green" };
    }
    if (event.selectionsSubmitted) {
      return { text: "Seleção recebida", icon: "📥", color: "purple" };
    }
    return { text: "Aguardando seleção", icon: "⏳", color: "gray" };
  };

  if (loading) {
    return <p className={styles.loading}>Carregando eventos...</p>;
  }

  return (
    <div className={styles.container}>
      <BackButton />

      <header className={styles.header}>
        <h1 className={styles.title}>Meus Eventos</h1>
        <p className={styles.subtitle}>
          Acompanhe todos os eventos e o progresso dos clientes
        </p>
      </header>

      {events.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>Nenhum evento criado ainda</h2>
          <p>Crie seu primeiro evento para começar a receber seleções.</p>
          <Link href="/dashboard/events/new" className={styles.createButton}>
            Criar Novo Evento
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {events.map((event) => {
            const status = getStatus(event);
            const progress = event.maxSelections > 0
              ? Math.round((event.selectedCount / event.maxSelections) * 100)
              : 0;

            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.eventName}>{event.name}</h3>
                  <p className={styles.clientName}>Cliente: {event.client}</p>
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Data do evento</span>
                    <strong className={styles.infoValue}>{event.eventDate}</strong>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Prazo de entrega</span>
                    <strong className={styles.infoValue}>{event.deliveryDate}</strong>
                  </div>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressInfo}>
                    <span className={styles.progressCount}>
                      {event.selectedCount} / {event.maxSelections}
                    </span>
                    <span className={styles.progressText}>selecionadas</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className={styles.footer}>
                  <div className={styles.statusBadge}>
                    <span className={styles.statusIcon}>{status.icon}</span>
                    <span className={styles[status.color]}>{status.text}</span>
                  </div>

                  <div className={styles.detailButton}>
                    Ver mais detalhes →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}