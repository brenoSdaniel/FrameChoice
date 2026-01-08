"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import styles from "./MyClients.module.css";
import BackButton from "@/components/BackButton";

interface Client {
  name: string;
  email: string;
  phone: string;
  eventCount: number; // Quantos eventos esse cliente tem
}

export default function MyClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      const user = auth.currentUser;
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const eventsRef = collection(db, "events");
        const q = query(eventsRef, where("photographerId", "==", user.uid));
        const snapshot = await getDocs(q);

        const clientsMap = new Map<string, Client>();

        snapshot.forEach((doc) => {
          const data = doc.data();
          const email = data.clientEmail?.toLowerCase();

          if (email) {
            if (clientsMap.has(email)) {
              // Já existe, só incrementa o contador
              const existing = clientsMap.get(email)!;
              existing.eventCount += 1;
            } else {
              // Novo cliente
              clientsMap.set(email, {
                name: data.client || "Sem nome",
                email: email,
                phone: data.clientPhone || "Não informado",
                eventCount: 1,
              });
            }
          }
        });

        const clientsList = Array.from(clientsMap.values());

        // Ordena por nome
        clientsList.sort((a, b) => a.name.localeCompare(b.name));

        setClients(clientsList);
        setFilteredClients(clientsList);
      } catch (err) {
        console.error("Erro ao buscar clientes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Filtro de busca
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredClients(clients);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      setFilteredClients(
        clients.filter(
          (client) =>
            client.name.toLowerCase().includes(lowerTerm) ||
            client.email.toLowerCase().includes(lowerTerm)
        )
      );
    }
  }, [searchTerm, clients]);

  if (loading) {
    return <p className={styles.loading}>Carregando clientes...</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Meus Clientes</h1>
          <p className={styles.subtitle}>
            {clients.length} cliente{clients.length !== 1 ? "s" : ""} cadastrado{clients.length !== 1 ? "s" : ""}
          </p>
        </header>

        {/* Busca */}
        {clients.length > 0 && (
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        )}

        {filteredClients.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>
              {searchTerm ? "Nenhum cliente encontrado" : "Você ainda não tem clientes"}
            </h2>
            <p>
              {searchTerm
                ? "Tente buscar por outro nome ou email."
                : "Quando você criar eventos, os clientes aparecerão aqui automaticamente."}
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredClients.map((client) => (
              <div key={client.email} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.clientName}>{client.name}</h3>
                  <span className={styles.eventCount}>
                    {client.eventCount} evento{client.eventCount !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className={styles.clientInfo}>
                  <p>
                    <strong>Email:</strong> {client.email}
                  </p>
                  <p>
                    <strong>Telefone:</strong> {client.phone}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}