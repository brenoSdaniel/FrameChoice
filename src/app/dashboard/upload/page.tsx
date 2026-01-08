"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import BackButton from "@/components/BackButton";
import styles from "./EventUpload.module.css";

interface Event {
  id: string;
  name: string;
  client: string;
  eventDate: string;
}

export default function EventUploadPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  // Dicas úteis que alternam durante o upload
  const uploadTips = [
    "💡 Dica: Fotos em JPG ou PNG com até 10MB enviam mais rápido!",
    "☕ Relaxe! Você pode deixar esta aba aberta enquanto toma um café.",
    "🔒 Todas as fotos são enviadas com segurança via Cloudinary.",
    "📶 Conexão instável? O upload continua automaticamente ao reconectar.",
    "✨ Após o envio, o cliente recebe acesso imediato à galeria!",
    "🖼️ Recomendamos nomes claros para as fotos (ex: 001_cerimonia.jpg)",
  ];

  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Alterna dicas durante o upload
  useEffect(() => {
    if (!uploading) return;

    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % uploadTips.length);
    }, 5000); // Troca a cada 5 segundos

    return () => clearInterval(interval);
  }, [uploading]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "events"),
          where("photographerId", "==", user.uid),
          orderBy("eventDate", "desc")
        );

        const snap = await getDocs(q);

        const list: Event[] = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name ?? "Evento sem nome",
            client: data.client ?? "Cliente não informado",
            eventDate:
              data.eventDate instanceof Timestamp
                ? data.eventDate.toDate().toLocaleDateString("pt-BR")
                : "-",
          };
        });

        setEvents(list);
      } catch (err) {
        console.error("Erro ao carregar eventos:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  async function loadUploadedPhotos(eventId: string) {
    try {
      const q = query(collection(db, "events", eventId, "photos"));
      const snap = await getDocs(q);
      const urls = snap.docs.map((doc) => doc.data().url as string);
      setUploadedPhotos(urls);
    } catch (err) {
      console.error("Erro ao carregar fotos enviadas:", err);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    previews.forEach((url) => URL.revokeObjectURL(url));

    const fileArray = Array.from(selected);
    setFiles(fileArray);
    setPreviews(fileArray.map((f) => URL.createObjectURL(f)));
  }

  async function uploadToCloudinary(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    formData.append("folder", `events/${selectedEvent!.id}`);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!res.ok) throw new Error("Falha no upload para Cloudinary");

    const data = await res.json();
    return data.secure_url as string;
  }

  async function handleUpload() {
    if (!selectedEvent || files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setUploadedCount(0);
    setCurrentTipIndex(0);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const imageUrl = await uploadToCloudinary(file);

        await addDoc(collection(db, "events", selectedEvent.id, "photos"), {
          url: imageUrl,
          name: file.name,
          createdAt: Timestamp.now(),
        });

        success++;
        setUploadedCount(success + failed);
        setProgress(Math.round(((success + failed) / files.length) * 100));
      } catch (err) {
        console.error(`Erro ao enviar ${file.name}:`, err);
        failed++;
        setUploadedCount(success + failed);
        setProgress(Math.round(((success + failed) / files.length) * 100));
      }
    }

    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);

    await loadUploadedPhotos(selectedEvent.id);

    setUploading(false);

    alert(
      `Upload concluído!\n\n` +
      `✅ ${success} foto(s) enviada(s)\n` +
      `${failed > 0 ? `❌ ${failed} falha(s)` : ""}`
    );
  }

  if (loading) return <p className={styles.loading}>Carregando eventos...</p>;
  if (events.length === 0) return <p className={styles.empty}>Nenhum evento encontrado</p>;

  return (
    <div className={styles.container}>
      <BackButton />

      <header className={styles.header}>
        <h1 className={styles.title}>Upload de Fotos</h1>
        <p className={styles.subtitle}>
          Selecione um evento e envie as fotos para o cliente visualizar
        </p>
      </header>

      {/* Seleção de evento */}
      <div className={styles.eventSelector}>
        <label className={styles.selectorLabel}>Selecione o evento</label>
        <select
          className={styles.selector}
          value={selectedEvent?.id ?? ""}
          onChange={async (e) => {
            const ev = events.find((ev) => ev.id === e.target.value) ?? null;
            setSelectedEvent(ev);
            setFiles([]);
            setPreviews([]);
            setUploadedPhotos([]);

            if (ev) await loadUploadedPhotos(ev.id);
          }}
        >
          <option value="">-- Escolha um evento --</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} — {ev.client} ({ev.eventDate})
            </option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <>
          {/* Área de upload */}
          <div className={styles.uploadArea}>
            <div className={styles.uploadBox}>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
                id="file-upload"
                disabled={uploading}
              />
              <label htmlFor="file-upload" className={styles.uploadLabel}>
                <span className={styles.uploadIcon}>📁</span>
                <span>{files.length > 0 ? `${files.length} foto(s) selecionada(s)` : "Clique ou arraste fotos aqui"}</span>
                <span className={styles.uploadHint}>
                  JPG, PNG, WEBP • Máximo 50MB por foto
                </span>
              </label>
            </div>

            {/* PROGRESSO + DICA ALTERNANDO DURANTE UPLOAD */}
            {uploading && (
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={styles.progressText}>
                  Enviando {uploadedCount} de {files.length} fotos... ({progress}%)
                </p>

                {/* DICA ALTERNANDO */}
                <p className={styles.uploadTip}>
                  {uploadTips[currentTipIndex]}
                </p>
              </div>
            )}

            {/* Botão de enviar */}
            {files.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={styles.uploadButton}
              >
                {uploading ? "Enviando fotos..." : `Enviar ${files.length} foto(s)`}
              </button>
            )}
          </div>

          {/* Fotos já enviadas */}
          {uploadedPhotos.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Fotos já enviadas ao cliente ({uploadedPhotos.length})
              </h2>
              <div className={styles.grid}>
                {uploadedPhotos.map((url, i) => (
                  <div key={i} className={styles.photoCard}>
                    <img src={url} alt={`Enviada ${i + 1}`} className={styles.photo} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Preview das novas fotos */}
          {previews.length > 0 && !uploading && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Fotos selecionadas para envio ({previews.length})
              </h2>
              <div className={styles.grid}>
                {previews.map((src, i) => (
                  <div key={i} className={styles.photoCard}>
                    <img src={src} alt={`Preview ${i + 1}`} className={styles.photo} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}