"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import styles from "./EventUpload.module.css";
import BackButton from "@/components/BackButton";

export default function EventUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);

  const [eventName, setEventName] = useState("Carregando...");
  const [clientName, setClientName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  const tips = [
    "💡 Dica: Fotos em JPG com até 10MB enviam mais rápido!",
    "☕ Fique tranquilo, você pode deixar a aba aberta enquanto toma um café.",
    "🔒 Seu upload é seguro e direto para o Cloudinary.",
    "🖼️ As fotos serão exibidas imediatamente para o cliente após o envio.",
    "✨ Quando terminar, o cliente receberá acesso à galeria!",
  ];
  const [currentTip, setCurrentTip] = useState(0);

  // Carrega o nome do evento
  useEffect(() => {
    const fetchEventName = async () => {
      if (!eventId) return;

      try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
          const data = eventSnap.data();
          setEventName(data.name || "Evento sem nome");
          setClientName(data.client || "");
        } else {
          setEventName("Evento não encontrado");
        }
      } catch (err) {
        console.error("Erro ao carregar nome do evento:", err);
        setEventName("Erro ao carregar");
      }
    };

    fetchEventName();
  }, [eventId]);

  // Alterna dicas durante upload
  useEffect(() => {
    if (!uploading) return;

    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [uploading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    previews.forEach((url) => URL.revokeObjectURL(url));

    const fileArray = Array.from(selected);
    setFiles(fileArray);
    setPreviews(fileArray.map((file) => URL.createObjectURL(file)));
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    formData.append("folder", `events/${eventId}`);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) throw new Error("Falha no upload para Cloudinary");

    const data = await res.json();
    return data.secure_url as string;
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert("Selecione pelo menos uma foto para enviar.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadedCount(0);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const imageUrl = await uploadToCloudinary(file);

        await addDoc(collection(db, "events", eventId, "photos"), {
          url: imageUrl,
          name: file.name,
          createdAt: serverTimestamp(),
        });

        success++;
      } catch (err) {
        console.error(`Erro ao enviar ${file.name}:`, err);
        failed++;
      }

      setUploadedCount(success + failed);
      setProgress(Math.round(((success + failed) / files.length) * 100));
    }

    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);

    setUploading(false);

    alert(
      `Upload concluído!\n\n` +
      `✅ ${success} foto(s) enviada(s)\n` +
      `${failed > 0 ? `❌ ${failed} falha(s)` : ""}`
    );
  };

  return (
    <div className={styles.page}>
      {/* BackButton fixo no topo esquerdo */}
      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <header className={styles.header}>
            <h1 className={styles.title}>Upload de Fotos</h1>
            <p className={styles.eventName}>
              <strong>{eventName}</strong>
            </p>
            {clientName && (
              <p className={styles.clientInfo}>
                Cliente: <strong>{clientName}</strong>
              </p>
            )}
          </header>

          <div className={styles.uploadArea}>
            <div className={styles.uploadBox}>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
                id="upload-input"
                disabled={uploading}
              />
              <label htmlFor="upload-input" className={styles.uploadLabel}>
                <span className={styles.uploadIcon}>📁</span>
                <span>
                  {files.length > 0
                    ? `${files.length} foto(s) selecionada(s)`
                    : "Clique ou arraste fotos aqui"}
                </span>
                <span className={styles.uploadHint}>
                  JPG, PNG, WEBP • Máximo 50MB por foto
                </span>
              </label>
            </div>

            {uploading && (
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={styles.progressText}>
                  Enviando {uploadedCount} de {files.length} fotos ({progress}%)
                </p>
                <p className={styles.tip}>{tips[currentTip]}</p>
              </div>
            )}

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

          {previews.length > 0 && (
            <section className={styles.previewSection}>
              <h2 className={styles.sectionTitle}>
                Fotos selecionadas para upload ({previews.length})
              </h2>
              <div className={styles.grid}>
                {previews.map((src, i) => (
                  <div key={i} className={styles.photoCard}>
                    <img src={src} alt={`Preview ${i + 1}`} className={styles.photo} />
                    <div className={styles.photoNumber}>{i + 1}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}