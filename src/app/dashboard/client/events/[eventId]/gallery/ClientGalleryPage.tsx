"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import styles from "./client-gallery.module.css";
import BackButton from "@/components/BackButton";

type Photo = {
  id: string;
  url: string;
  name: string;
  selected: boolean;
  displayIndex: number;
};

type Event = {
  id: string;
  name: string;
  maxSelections: number;
  totalPhotos: number;
  selectionsSubmitted: boolean;
};

interface Props {
  eventId: string;
}

export default function ClientGalleryPage({ eventId }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [selectionsSubmitted, setSelectionsSubmitted] = useState(false);
  const [exactLimitReached, setExactLimitReached] = useState(false);
  const [sending, setSending] = useState(false);

  // Carrega evento e verifica permissão
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, "events", eventId));
        if (!eventDoc.exists()) {
          setLoadingEvent(false);
          return;
        }

        const data = eventDoc.data();
        const currentUser = (await import("firebase/auth")).getAuth().currentUser;

        if (!currentUser || (data.clientEmail !== currentUser.email && data.photographerId !== currentUser.uid)) {
          setLoadingEvent(false);
          return;
        }

        const eventInfo = {
          id: eventDoc.id,
          name: data.name || "Galeria",
          maxSelections: data.maxSelections || 0,
          totalPhotos: data.totalPhotos || 0,
          selectionsSubmitted: !!data.selectionsSubmitted,
        };

        setEvent(eventInfo);
        setSelectionsSubmitted(!!data.selectionsSubmitted);
        setLoadingEvent(false);
      } catch (err) {
        console.error("Erro ao buscar evento:", err);
        setLoadingEvent(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Carrega fotos e aplica seleção
  useEffect(() => {
    if (!event || loadingEvent) return;

    const fetchPhotos = async () => {
      try {
        const photosRef = collection(db, `events/${eventId}/photos`);
        const snapshot = await getDocs(photosRef);

        let photoList = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            url: d.url,
            name: d.name || docSnap.id,
            selected: false,
            displayIndex: 0,
          };
        });

        // Ordenação numérica pelo nome do arquivo
        photoList.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true })
        );

        // Numeração bonita
        photoList = photoList.map((photo, index) => ({
          ...photo,
          displayIndex: index + 1,
        }));

        // Marca as selecionadas
        if (selectionsSubmitted) {
          const eventDoc = await getDoc(doc(db, "events", eventId));
          const selectedIds = Array.isArray(eventDoc.data()?.selectedPhotos)
            ? eventDoc.data()?.selectedPhotos
            : [];

          photoList = photoList.map((photo) => ({
            ...photo,
            selected: selectedIds.includes(photo.id),
          }));
        } else {
          const currentUser = (await import("firebase/auth")).getAuth().currentUser;
          photoList = photoList.map((photo) => {
            const d = snapshot.docs.find((d) => d.id === photo.id)?.data();
            return {
              ...photo,
              selected: Array.isArray(d?.selectedBy)
                ? d.selectedBy.includes(currentUser?.email)
                : false,
            };
          });
        }

        setPhotos(photoList);
      } catch (err) {
        console.error("Erro ao buscar fotos:", err);
      }
    };

    fetchPhotos();
  }, [event, eventId, loadingEvent, selectionsSubmitted]);

  const selectedCount = photos.filter((p) => p.selected).length;

  useEffect(() => {
    if (event?.maxSelections > 0 && selectedCount === event.maxSelections) {
      setExactLimitReached(true);
    } else {
      setExactLimitReached(false);
    }
  }, [selectedCount, event]);

  const toggleSelect = async (photoId: string, currentlySelected: boolean) => {
    if (!event || selectionsSubmitted) return;

    if (!currentlySelected && event.maxSelections > 0 && selectedCount >= event.maxSelections) {
      alert(`Você já selecionou ${event.maxSelections} fotos. Desmarque uma para escolher outra.`);
      return;
    }

    const currentUser = (await import("firebase/auth")).getAuth().currentUser;
    if (!currentUser) return;

    const photoRef = doc(db, `events/${eventId}/photos`, photoId);

    try {
      if (currentlySelected) {
        await updateDoc(photoRef, { selectedBy: arrayRemove(currentUser.email) });
      } else {
        await updateDoc(photoRef, { selectedBy: arrayUnion(currentUser.email) });
      }

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, selected: !currentlySelected } : p
        )
      );
    } catch (err) {
      console.error("Erro ao atualizar seleção:", err);
      alert("Erro ao salvar seleção.");
    }
  };

  const submitSelections = async () => {
    if (!event || !exactLimitReached || selectionsSubmitted || sending) return;

    const selectedPhotoIds = photos.filter((p) => p.selected).map((p) => p.id);
    const currentUser = (await import("firebase/auth")).getAuth().currentUser;

    setSending(true);

    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        selectedPhotos: selectedPhotoIds,
        selectionsSubmitted: true,
        submittedAt: Timestamp.now(),
        submittedBy: currentUser?.email,
      });

      setSelectionsSubmitted(true);
      alert("✅ Sua seleção foi enviada com sucesso ao fotógrafo!");
    } catch (err) {
      console.error("Erro ao enviar seleção:", err);
      alert("Falha ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const openFullscreen = (url: string) => setFullscreenImage(url);
  const closeFullscreen = () => setFullscreenImage(null);

  const preventDownload = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
  };

  if (loadingEvent) return <p className={styles.loading}>Carregando galeria...</p>;
  if (!event) return <p className={styles.error}>Evento não encontrado ou sem acesso.</p>;

  const progressPercent = event.maxSelections > 0
    ? (selectedCount / event.maxSelections) * 100
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>{event.name}</h1>

          <div className={styles.counter}>
            <div className={styles.countNumber}>
              <span className={styles.selectedCount}>{selectedCount}</span>
              <span className={styles.totalCount}> / {event.maxSelections || "∞"}</span>
            </div>
            <p className={styles.counterLabel}>fotos selecionadas</p>
          </div>

          {event.maxSelections > 0 && (
            <>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {exactLimitReached ? (
                <p className={styles.limitReached}>
                  🎯 Perfeito! Você selecionou exatamente {event.maxSelections} fotos.
                </p>
              ) : selectedCount > 0 ? (
                <p className={styles.infoMessage}>
                  Faltam {event.maxSelections - selectedCount} foto(s) para completar
                </p>
              ) : null}
            </>
          )}

          {selectionsSubmitted ? (
            <p className={styles.submittedMessage}>
              ✅ Sua seleção foi enviada ao fotógrafo!<br />
              Aguarde as fotos editadas.
            </p>
          ) : (
            event.maxSelections > 0 && (
              <button
                onClick={submitSelections}
                disabled={!exactLimitReached || sending}
                className={styles.submitButton}
              >
                {sending ? "Enviando..." : `Enviar Seleção (${event.maxSelections} fotos)`}
              </button>
            )
          )}
        </header>

        {photos.length === 0 ? (
          <div className={styles.emptyState}>
            <p>O fotógrafo ainda não enviou as fotos deste evento.</p>
            <p>Volte mais tarde!</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`${styles.photoCard} ${photo.selected ? styles.selected : ""}`}
              >
                <img
                  src={photo.url}
                  alt={`Foto ${photo.displayIndex}`}
                  className={styles.photo}
                  onClick={() => openFullscreen(photo.url)}
                  onContextMenu={preventDownload}
                  onDragStart={preventDownload}
                  draggable={false}
                />

                {/* Marca d'água */}
                <div className={styles.watermarkLarge}>SAMPLE</div>
                <div className={styles.watermarkText}>FrameChoice - CONFIDENCIAL</div>

                <div className={styles.photoIndex}>
                  {String(photo.displayIndex).padStart(4, "0")}
                </div>

                {!selectionsSubmitted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(photo.id, photo.selected);
                    }}
                    className={styles.selectButton}
                  >
                    {photo.selected ? "Deselecionar" : "Selecionar"}
                  </button>
                )}

                {selectionsSubmitted && photo.selected && (
                  <div className={styles.selectedBadge}>✓ Selecionada</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div className={styles.fullscreenModal} onClick={closeFullscreen}>
          <div className={styles.modalContent}>
            <img
              src={fullscreenImage}
              alt="Zoom"
              className={styles.fullscreenImage}
              onContextMenu={preventDownload}
              onDragStart={preventDownload}
              draggable={false}
            />
            <div className={styles.watermarkLarge}>SAMPLE</div>
            <div className={styles.watermarkText}>FrameChoice - CONFIDENCIAL</div>
            <button onClick={closeFullscreen} className={styles.closeButton}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}