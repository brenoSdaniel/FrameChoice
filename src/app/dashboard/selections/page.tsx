"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./selections.module.css";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp, doc } from "firebase/firestore";
import BackButton from "@/components/BackButton";

interface Event {
  id: string;
  name: string;
  client: string;
  selectedCount: number;
  maxSelections: number;
  selectionsSubmitted: boolean;
  finalPhotosReady?: boolean;
  deliveryDate: string;
}

export default function SelectionsPage() {
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

          // Contagem de seleções
          let selectedCount = 0;
          if (Array.isArray(data.selectedPhotos)) {
            selectedCount = data.selectedPhotos.length;
          } else {
            const selectionsRef = collection(db, "events", docSnap.id, "selections");
            const selectionsSnap = await getDocs(selectionsRef);
            selectedCount = selectionsSnap.size;
          }

          // Prazo
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
            selectedCount,
            maxSelections: data.maxSelections || 0,
            selectionsSubmitted: !!data.selectionsSubmitted || selectedCount > 0,
            finalPhotosReady: !!data.finalPhotosReady,
            deliveryDate,
          });
        }

        // Ordenação: seleções recebidas primeiro
        eventsList.sort((a, b) => {
          if (a.selectionsSubmitted && !b.selectionsSubmitted) return -1;
          if (!a.selectionsSubmitted && b.selectionsSubmitted) return 1;
          return 0;
        });

        setEvents(eventsList);
      } catch (err: any) {
        console.error("Erro ao buscar eventos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getStatus = (event: Event) => {
    if (event.finalPhotosReady) {
      return { text: "Fotos finais entregues", icon: "✅", color: "green" };
    }
    if (event.selectionsSubmitted) {
      return { text: "Seleção recebida", icon: "📥", color: "purple" };
    }
    return { text: "Aguardando seleção", icon: "⏳", color: "gray" };
  };

  if (loading) {
    return <p className={styles.loading}>Carregando seleções...</p>;
  }

  if (events.length === 0) {
    return (
      <main className={styles.container}>
        <BackButton />
        <div className={styles.empty}>
          <h2>Nenhum evento encontrado</h2>
          <p>Crie um evento e compartilhe o link com seu cliente para começar.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <BackButton />

      <header className={styles.header}>
        <h1>Seleções dos Clientes</h1>
        <p>Acompanhe quais clientes já enviaram suas fotos favoritas</p>
      </header>

      <div className={styles.grid}>
        {events.map((event) => {
          const status = getStatus(event);
          const progress = event.maxSelections > 0
            ? Math.round((event.selectedCount / event.maxSelections) * 100)
            : 100;

          return (
            <Link
              key={event.id}
              href={`/dashboard/selections/${event.id}`}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.eventName}>{event.name}</h3>
                <p className={styles.clientName}>Cliente: {event.client}</p>
              </div>

              <div className={styles.progressSection}>
                <div className={styles.progressInfo}>
                  <span className={styles.count}>
                    {event.selectedCount} / {event.maxSelections}
                  </span>
                  <span className={styles.progressLabel}>fotos selecionadas</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className={styles.statusBadge}>
                <span className={styles.statusIcon}>{status.icon}</span>
                <span className={styles[status.color]}>{status.text}</span>
              </div>

              {event.deliveryDate !== "Não informado" && (
                <div className={styles.deadline}>
                  <span>Prazo de entrega:</span>
                  <strong>{event.deliveryDate}</strong>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}