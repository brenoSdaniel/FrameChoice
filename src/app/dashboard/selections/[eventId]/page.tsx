"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import styles from "./Dashboard.module.css";
import BackButton from "@/components/BackButton";

interface Photo {
  id: string;
  url: string;
}

export default function EventSelectionPage() {
  const { eventId } = useParams() as { eventId: string };
  const [event, setEvent] = useState<any | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedCount, setDownloadedCount] = useState(0);

  // Upload de fotos editadas
  const [editedFiles, setEditedFiles] = useState<File[]>([]);
  const [uploadingEdited, setUploadingEdited] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedEditedCount, setUploadedEditedCount] = useState(0);

  const tips = [
    "💡 Dica: Use nomes claros como '001_final.jpg' para organizar melhor!",
    "☕ Fique tranquilo, o upload é seguro e rápido.",
    "🔒 As fotos são enviadas diretamente ao cliente após o envio.",
    "✨ O cliente será notificado assim que as fotos finais estiverem prontas!",
  ];
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    if (!uploadingEdited) return;

    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [uploadingEdited]);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;

      try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) {
          setLoading(false);
          return;
        }

        const data = eventSnap.data();

        const formattedEvent = {
          name: data.name || "Evento sem nome",
          client: data.client || "Cliente não informado",
          maxSelections: data.maxSelections || 0,
          deadline:
            data.deliveryDate instanceof Timestamp
              ? data.deliveryDate.toDate().toLocaleDateString("pt-BR")
              : data.deliveryDate || "Não informado",
          submittedAt:
            data.submittedAt instanceof Timestamp
              ? data.submittedAt.toDate().toLocaleString("pt-BR")
              : null,
          selectionsSubmitted: !!data.selectionsSubmitted,
          finalPhotosReady: !!data.finalPhotosReady,
        };

        setEvent(formattedEvent);

        let photosList: Photo[] = [];

        if (Array.isArray(data.selectedPhotos) && data.selectedPhotos.length > 0) {
          const photosRef = collection(db, `events/${eventId}/photos`);
          const allPhotosSnap = await getDocs(photosRef);
          const photoMap = new Map<string, string>();

          allPhotosSnap.forEach((p) => {
            photoMap.set(p.id, p.data().url);
          });

          photosList = data.selectedPhotos
            .map((id: string) => ({
              id,
              url: photoMap.get(id) || "",
            }))
            .filter((p) => p.url);
        }

        setSelectedPhotos(photosList);
      } catch (err) {
        console.error("Erro ao carregar:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Download individual
  const downloadSinglePhoto = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha ao baixar");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${
        event?.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "evento"
      }_foto_${String(index + 1).padStart(3, "0")}.jpg`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Erro ao baixar foto individual:", err);
    }
  };

  // Download todas
  const downloadAllPhotos = async () => {
    if (selectedPhotos.length === 0) {
      alert("Nenhuma foto disponível para download.");
      return;
    }

    const confirmed = window.confirm(
      `Baixar todas as ${selectedPhotos.length} fotos selecionadas?`
    );
    if (!confirmed) return;

    setDownloading(true);
    setProgress(0);
    setDownloadedCount(0);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < selectedPhotos.length; i++) {
      try {
        const response = await fetch(selectedPhotos[i].url);
        if (!response.ok) throw new Error("Falha");

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${
          event?.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "evento"
        }_foto_${String(i + 1).padStart(3, "0")}.jpg`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(blobUrl);
        success++;
      } catch {
        failed++;
      }

      setDownloadedCount(success + failed);
      setProgress(
        Math.round(((success + failed) / selectedPhotos.length) * 100)
      );

      await new Promise((r) => setTimeout(r, 150));
    }

    setDownloading(false);

    alert(
      `Download concluído!\n\n✅ ${success} baixadas\n${
        failed ? `❌ ${failed} falharam` : ""
      }`
    );
  };

  // =============================
  // UPLOAD — CLOUDINARY (ÚNICA MUDANÇA)
  // =============================
  const handleEditedFilesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;
    setEditedFiles(Array.from(e.target.files));
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );
    formData.append("folder", `final-photos/${eventId}`);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) throw new Error("Erro no Cloudinary");

    const data = await res.json();
    return data.secure_url as string;
  };

  const uploadEditedPhotos = async () => {
    if (editedFiles.length === 0) {
      alert("Selecione as fotos editadas para enviar.");
      return;
    }

    const confirmed = window.confirm(
      `Enviar ${editedFiles.length} foto(s) editada(s) para o cliente?`
    );
    if (!confirmed) return;

    setUploadingEdited(true);
    setUploadProgress(0);
    setUploadedEditedCount(0);

    const finalUrls: string[] = [];

    try {
      for (let i = 0; i < editedFiles.length; i++) {
        const url = await uploadToCloudinary(editedFiles[i]);
        finalUrls.push(url);

        setUploadedEditedCount(i + 1);
        setUploadProgress(
          Math.round(((i + 1) / editedFiles.length) * 100)
        );
      }

      await updateDoc(doc(db, "events", eventId), {
        finalPhotos: finalUrls,
        finalPhotosReady: true,
        deliveredAt: Timestamp.now(),
      });

      alert("Fotos finais enviadas com sucesso!");
      setEvent({ ...event, finalPhotosReady: true });
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar fotos.");
    } finally {
      setUploadingEdited(false);
      setEditedFiles([]);
    }
  };

  if (loading) return <p className={styles.loading}>Carregando seleção...</p>;
  if (!event) return <p className={styles.error}>Evento não encontrado.</p>;

  return (
    <main className={styles.container}>
      <BackButton />

      <header className={styles.header}>
        <h1>{event.name}</h1>
        <p className={styles.clientInfo}>
          Cliente: <strong>{event.client}</strong>
        </p>
        {event.submittedAt && (
          <p className={styles.submittedInfo}>
            Seleção recebida em: <strong>{event.submittedAt}</strong>
          </p>
        )}
      </header>

      <div className={styles.summary}>
        <div className={styles.infoItem}>
          <span className={styles.label}>Selecionadas</span>
          <strong className={styles.value}>{selectedPhotos.length}</strong>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.label}>Limite</span>
          <strong className={styles.value}>{event.maxSelections}</strong>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.label}>Prazo</span>
          <strong className={styles.value}>{event.deadline}</strong>
        </div>
      </div>

      {/* BAIXAR TODAS */}
      {selectedPhotos.length > 0 && (
        <div className={styles.downloadSection}>
          <button
            onClick={downloadAllPhotos}
            disabled={downloading}
            className={styles.downloadButton}
          >
            {downloading ? "Baixando todas..." : `Baixar Todas (${selectedPhotos.length} fotos)`}
          </button>

          {downloading && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={styles.progressText}>
                {downloadedCount} de {selectedPhotos.length} fotos ({progress}%)
              </p>
              <p className={styles.tip}>{tips[currentTip]}</p>
            </div>
          )}
        </div>
      )}

      {/* ENVIAR FOTOS PRONTAS */}
      {event.selectionsSubmitted && !event.finalPhotosReady && (
        <div className={styles.editedUploadSection}>
          <h2 className={styles.sectionTitle}>Enviar Fotos Prontas</h2>
          <p className={styles.sectionSubtitle}>
            Após editar as fotos selecionadas, envie as versões finais para o cliente
          </p>

          <div className={styles.uploadBox}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleEditedFilesChange}
              className={styles.fileInput}
              id="edited-upload"
              disabled={uploadingEdited}
            />
            <label htmlFor="edited-upload" className={styles.uploadLabel}>
              <span className={styles.uploadIcon}>📤</span>
              <span>
                {editedFiles.length > 0
                  ? `${editedFiles.length} foto(s) pronta(s) para envio`
                  : "Selecionar fotos editadas"}
              </span>
              <span className={styles.uploadHint}>
                Recomendado: {selectedPhotos.length} fotos
              </span>
            </label>
          </div>

          {uploadingEdited && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className={styles.progressText}>
                Enviando {uploadedEditedCount} de {editedFiles.length} fotos... ({uploadProgress}%)
              </p>
              <p className={styles.tip}>{tips[currentTip]}</p>
            </div>
          )}

          {editedFiles.length > 0 && (
            <button
              onClick={uploadEditedPhotos}
              disabled={uploadingEdited}
              className={styles.sendEditedButton}
            >
              {uploadingEdited ? "Enviando para o cliente..." : "Enviar Fotos Prontas ao Cliente"}
            </button>
          )}
        </div>
      )}

      {/* Mensagem se já enviou */}
      {event.finalPhotosReady && (
        <div className={styles.finalDelivered}>
          <p className={styles.deliveredMessage}>
            ✅ Fotos prontas já foram enviadas ao cliente!
          </p>
          <p className={styles.deliveredSub}>
            O cliente já pode visualizar e baixar as fotos editadas.
          </p>
        </div>
      )}

      {/* Fotos selecionadas pelo cliente */}
      <section className={styles.photosSection}>
        <h2 className={styles.sectionTitle}>
          Fotos selecionadas pelo cliente ({selectedPhotos.length})
        </h2>
        <p className={styles.sectionSubtitle}>
          Clique em qualquer foto para baixar e editar
        </p>

        <div className={styles.grid}>
          {selectedPhotos.length === 0 ? (
            <div className={styles.emptyState}>
              <p>O cliente ainda não enviou a seleção.</p>
            </div>
          ) : (
            selectedPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className={styles.photoCard}
                onClick={() => downloadSinglePhoto(photo.url, index)}
                style={{ cursor: "pointer" }}
              >
                <img src={photo.url} alt={`Foto ${index + 1}`} className={styles.photo} />
                <div className={styles.photoNumber}>{index + 1}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}