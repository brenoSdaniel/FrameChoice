"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import styles from "./downloads.module.css";
import BackButton from "@/components/BackButton";

type Event = {
  id: string;
  name: string;
  maxSelections: number;
  selectionsSubmitted: boolean;
  finalPhotosReady: boolean;
  finalPhotosCount: number;
};

export default function DownloadsPage() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [downloadingEventId, setDownloadingEventId] = useState<string | null>(
    null
  );
  const [progress, setProgress] = useState(0);

  // =========================
  // Auth
  // =========================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // =========================
  // Buscar eventos do cliente
  // =========================
  useEffect(() => {
    if (!user?.email) return;

    const fetchEvents = async () => {
      try {
        const q = query(
          collection(db, "events"),
          where("clientEmail", "==", user.email)
        );

        const snapshot = await getDocs(q);
        const list: Event[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          list.push({
            id: docSnap.id,
            name: data.name || "Evento sem nome",
            maxSelections: data.maxSelections || 0,
            selectionsSubmitted: !!data.selectionsSubmitted,
            finalPhotosReady: !!data.finalPhotosReady,
            finalPhotosCount: Array.isArray(data.finalPhotos)
              ? data.finalPhotos.length
              : 0,
          });
        });

        setEvents(list);
      } catch (err) {
        console.error("Erro ao carregar eventos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  // =========================
  // DOWNLOAD DAS FOTOS FINAIS
  // =========================
  const downloadFinalPhotos = async (eventId: string, eventName: string) => {
    const confirmed = window.confirm(
      "Deseja baixar todas as fotos finais deste evento?"
    );
    if (!confirmed) return;

    setDownloadingEventId(eventId);
    setProgress(0);

    try {
      const ref = doc(db, "events", eventId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Evento não encontrado.");
        return;
      }

      const data = snap.data();
      const finalPhotos: string[] = data.finalPhotos || [];

      if (finalPhotos.length === 0) {
        alert("Nenhuma foto disponível.");
        return;
      }

      for (let i = 0; i < finalPhotos.length; i++) {
        try {
          const res = await fetch(finalPhotos[i]);
          if (!res.ok) throw new Error();

          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `${eventName
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase()}_final_${String(i + 1).padStart(3, "0")}.jpg`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          URL.revokeObjectURL(blobUrl);
        } catch (err) {
          console.error("Erro ao baixar imagem:", err);
        }

        setProgress(Math.round(((i + 1) / finalPhotos.length) * 100));
        await new Promise((r) => setTimeout(r, 150));
      }

      alert("Download concluído com sucesso!");
    } catch (err) {
      console.error("Erro no download:", err);
      alert("Erro ao baixar as fotos.");
    } finally {
      setDownloadingEventId(null);
      setProgress(0);
    }
  };

  // =========================
  // Estados de tela
  // =========================
  if (loading) {
    return <p className={styles.center}>Carregando suas fotos...</p>;
  }

  if (!user) {
    return <p className={styles.center}>Você precisa estar logado.</p>;
  }

  // =========================
  // Render
  // =========================
  return (
    <div className={styles.container}>
      <BackButton />

      <h1>Downloads das Fotos Editadas</h1>
      <p className={styles.subtitle}>
        Baixe as fotos finais enviadas pelo fotógrafo
      </p>

      {events.length === 0 ? (
        <div className={styles.empty}>
          <p>Você ainda não tem eventos com fotos prontas.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {events.map((event) => (
            <div key={event.id} className={styles.card}>
              <h2 className={styles.title}>{event.name}</h2>

              <div className={styles.status}>
                {event.finalPhotosReady ? (
                  <div className={styles.ready}>
                    🎉 {event.finalPhotosCount} foto
                    {event.finalPhotosCount !== 1 ? "s" : ""} disponível(is)
                  </div>
                ) : (
                  <div className={styles.processing}>
                    ⌛ Em edição pelo fotógrafo
                  </div>
                )}
              </div>

             <div className={styles.actions}>
  {event.finalPhotosReady ? (
    <button
      type="button"
      className={styles.downloadBtn}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log("DOWNLOAD CLICADO:", event.id);
        downloadFinalPhotos(event.id, event.name);
      }}
      disabled={downloadingEventId === event.id}
    >
      {downloadingEventId === event.id
        ? `Baixando... ${progress}%`
        : "Baixar Fotos Prontas"}
    </button>
  ) : (
    <button className={styles.disabledBtn} disabled>
      Ainda não disponível
    </button>
  )}
</div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
