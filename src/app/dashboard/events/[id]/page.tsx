"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import Link from "next/link";
import styles from "./EventDetails.module.css";
import BackButton from "@/components/BackButton";

interface EventData {
  name: string;
  client: string;
  deliveryDate: string;
  maxSelections: number;
  uploadedPhotos: number;
}

export default function EventDetailsPageClient() {
  const params = useParams();
  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    async function fetchEvent() {
      try {
        // Forma correta e segura no Firebase modular
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) {
          setEvent(null);
          setLoading(false);
          return;
        }

        const data = eventSnap.data();

        // Subcoleção photos — forma correta
        const photosRef = collection(db, "events", eventId, "photos");
        const photosSnap = await getDocs(photosRef);

        // Formatação da data
        let formattedDeliveryDate = "Não informado";
        if (data.deliveryDate) {
          const date = data.deliveryDate instanceof Timestamp
            ? data.deliveryDate.toDate()
            : new Date(data.deliveryDate);

          formattedDeliveryDate = date.toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).replace(" de ", " "); // "15 jan 2026"
        }

        setEvent({
          name: data.name || "Evento sem nome",
          client: data.clientEmail || data.client || "Cliente não informado",
          maxSelections: data.maxSelections || 0,
          uploadedPhotos: photosSnap.size,
          deliveryDate: formattedDeliveryDate,
        });
      } catch (error) {
        console.error("Erro ao buscar evento:", error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [eventId]);

  if (loading) {
    return <p className={styles.loading}>Carregando detalhes do evento...</p>;
  }

  if (!event) {
    return <p className={styles.error}>Evento não encontrado.</p>;
  }

  return (
    <div className={styles.container}>
      <BackButton />

      <header className={styles.header}>
        <h1 className={styles.title}>{event.name}</h1>
        <p className={styles.clientInfo}>
          Cliente: <strong>{event.client}</strong>
        </p>
      </header>

      <section className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Fotos enviadas</span>
          <strong className={styles.infoValue}>{event.uploadedPhotos}</strong>
        </div>

        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Limite de seleção</span>
          <strong className={styles.infoValue}>{event.maxSelections}</strong>
        </div>

        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Prazo de entrega</span>
          <strong className={styles.infoValue}>{event.deliveryDate}</strong>
        </div>
      </section>

      <section className={styles.actionSection}>
        <Link
          href={`/dashboard/events/${eventId}/upload`}
          className={styles.actionButton}
        >
          📸 Enviar ou Gerenciar Fotos
        </Link>

        <Link
          href={`/dashboard/selections/${eventId}`}
          className={styles.actionButton}
        >
          📥 Ver Seleção do Cliente
        </Link>
      </section>
    </div>
  );
}