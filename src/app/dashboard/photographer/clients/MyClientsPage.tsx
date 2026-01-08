"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, auth } from "../../../../lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  notes?: string;
}

export default function MyClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      if (!auth.currentUser) return;

      try {
        const photographerId = auth.currentUser.uid;

        const clientsRef = collection(db, "clients");
        const q = query(
          clientsRef,
          where("photographerId", "==", photographerId),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        const clientsList: Client[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "-",
            email: data.email || "-",
            phone: data.phone || "-",
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toLocaleDateString()
              : data.createdAt || "-",
            notes: data.notes || "",
          };
        });

        setClients(clientsList);
      } catch (err: any) {
        console.error("Erro ao buscar clientes:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  if (loading) return <p>Carregando clientes...</p>;
  if (clients.length === 0) return <p>Você não possui clientes ainda.</p>;

  return (
    <div>
      <header style={{ marginBottom: 32 }}>
        <h1>Meus Clientes</h1>
        <Link href="/dashboard/clients/new">+ Adicionar Cliente</Link>
      </header>

      <section style={{ display: "grid", gap: 16 }}>
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/dashboard/clients/${client.id}`}
            style={{
              display: "block",
              border: "1px solid #1f2937",
              borderRadius: 12,
              padding: 20,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <h3>{client.name}</h3>
            <p>Email: {client.email}</p>
            <p>Telefone: {client.phone}</p>
            <span style={{ fontSize: 14, opacity: 0.7 }}>Ver detalhes →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
