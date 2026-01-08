"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import styles from "./client-gallery.module.css";
import BackButton from "@/components/BackButton";
type Event = {
  id: string;
  name: string;
};

export default function ClientEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u?.email) return;
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    const fetchEvents = async () => {
      const q = query(
        collection(db, "events"),
        where("clientEmail", "==", user.email)
      );

      const snap = await getDocs(q);

      setEvents(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "Evento",
        }))
      );

      setLoading(false);
    };

    fetchEvents();
  }, [user]);

  if (loading) {
    return <p className={styles.loading}>Carregando eventos...</p>;
  }

  return (
    <div className={styles.container}>
     <BackButton /> 
      <div className={styles.header}>
        <h1 className={styles.title}>Escolha um evento</h1>
        <p className={styles.subtitle}>
          Selecione o evento para escolher suas fotos
        </p>
      </div>

      {events.length === 0 ? (
        <p className={styles.empty}>Nenhum evento disponível.</p>
      ) : (
        <div className={styles.grid}>
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/client/events/${event.id}/gallery`}
              className={styles.card}
            >
              <div className={styles.eventName}>{event.name}</div>
              <div className={styles.cta}>Entrar no evento →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
