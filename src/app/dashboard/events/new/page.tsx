"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/components/AlertContext";
import styles from "./NewEvent.module.css";
import BackButton from "@/components/BackButton";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function NewEventPage() {
  const router = useRouter();
  const { showAlert } = useAlert();

  const [form, setForm] = useState({
    name: "",
    client: "",
    clientEmail: "",
    clientPhone: "",
    eventDate: "",
    maxSelections: 30,
    deliveryDate: "",
    notes: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) return showAlert("error", "O nome do evento é obrigatório");
    if (!form.client.trim()) return showAlert("error", "Informe o nome do cliente");
    if (!form.clientEmail.trim()) return showAlert("error", "Informe o email do cliente");
    if (!form.clientPhone.trim()) return showAlert("error", "Informe o telefone do cliente");
    if (!form.eventDate) return showAlert("error", "Informe a data do evento");
    if (form.maxSelections <= 0) return showAlert("warning", "A quantidade máxima deve ser maior que zero");
    if (!form.deliveryDate) return showAlert("error", "Informe o prazo de entrega");
    if (new Date(form.deliveryDate) < new Date(form.eventDate)) {
      return showAlert("warning", "O prazo de entrega não pode ser anterior à data do evento");
    }

    const user = auth.currentUser;
    if (!user?.uid) {
      showAlert("error", "Sessão expirada. Faça login novamente.");
      return;
    }

    try {
      await addDoc(collection(db, "events"), {
        name: form.name.trim(),
        client: form.client.trim(),
        clientEmail: form.clientEmail.trim().toLowerCase(),
        clientPhone: form.clientPhone.trim(),
        eventDate: form.eventDate,
        deliveryDate: form.deliveryDate,
        maxSelections: Number(form.maxSelections),
        notes: form.notes.trim(),
        photographerId: user.uid,
        status: "active",
        createdAt: serverTimestamp(),
        selectionsSubmitted: false,
      });

      showAlert("success", "Evento criado com sucesso!");
      router.push("/dashboard/events");
    } catch (error) {
      console.error(error);
      showAlert("error", "Erro ao criar evento");
    }
  }

  return (
    <div className={styles.page}>
      <BackButton />

      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Criar novo evento</h1>
          <p className={styles.subtitle}>
            Configure as regras do evento antes de enviar as fotos ao cliente
          </p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Nome do evento */}
          <div className={styles.field}>
            <label>Nome do evento</label>
            <input
              name="name"
              placeholder="Ex: Casamento Ana & João"
              value={form.name}
              onChange={handleChange}
              required
            />
            <small>Esse nome será exibido para você e para o cliente.</small>
          </div>

          {/* Nome do cliente */}
          <div className={styles.field}>
            <label>Cliente</label>
            <input
              name="client"
              placeholder="Nome do cliente"
              value={form.client}
              onChange={handleChange}
              required
            />
            <small>Identifique facilmente para quem este evento pertence.</small>
          </div>

          {/* Email do cliente */}
          <div className={styles.field}>
            <label>Email do cliente</label>
            <input
              type="email"
              name="clientEmail"
              placeholder="cliente@email.com"
              value={form.clientEmail}
              onChange={handleChange}
              required
            />
            <small>Email para contato ou notificações do evento.</small>
          </div>

          {/* Telefone do cliente */}
          <div className={styles.field}>
            <label>Telefone do cliente</label>
            <input
              type="tel"
              name="clientPhone"
              placeholder="(11) 99999-9999"
              value={form.clientPhone}
              onChange={handleChange}
              required
            />
            <small>Telefone para contato rápido com o cliente.</small>
          </div>

          {/* Data do evento */}
          <div className={styles.field}>
            <label>Data do evento</label>
            <input
              type="date"
              name="eventDate"
              value={form.eventDate}
              onChange={handleChange}
              required
            />
            <small>Data em que as fotos foram feitas.</small>
          </div>

          {/* Quantidade máxima de fotos */}
          <div className={styles.field}>
            <label>Quantidade máxima de fotos selecionáveis</label>
            <input
              type="number"
              name="maxSelections"
              value={form.maxSelections}
              min={1}
              onChange={handleChange}
              required
            />
            <small>O cliente poderá selecionar até esse número de fotos.</small>
          </div>

          {/* Prazo de entrega */}
          <div className={styles.field}>
            <label>Prazo de entrega</label>
            <input
              type="date"
              name="deliveryDate"
              value={form.deliveryDate}
              onChange={handleChange}
              required
            />
            <small>Data limite para entrega das fotos prontas.</small>
          </div>

          {/* Observações */}
          <div className={styles.field}>
            <label>Observações (opcional)</label>
            <textarea
              name="notes"
              placeholder="Ex: edição em preto e branco, fotos externas..."
              value={form.notes}
              onChange={handleChange}
              rows={4}
            />
            <small>Informações extras visíveis apenas para você.</small>
          </div>

          <button type="submit" className={styles.submit}>
            Criar evento
          </button>
        </form>
      </div>
    </div>
  );
}