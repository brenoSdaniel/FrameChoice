// cleanup-expired.js
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const crypto = require("crypto");

// === CONFIGURAÇÃO DO FIREBASE ===
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// === SUAS CREDENCIAIS DO CLOUDINARY ===
const CLOUDINARY_CLOUD_NAME = "dvrv411vw"; // ex: "dabc12345"
const CLOUDINARY_API_KEY = "519772613563725";
const CLOUDINARY_API_SECRET = "_QY3i3Xmvi9ES48VtHckEv9UsKI";

const DAYS_UNTIL_DELETE = 90; // dias após entrega final

async function cleanupExpired() {
  console.log("Iniciando limpeza automática de fotos expiradas...");

  const now = admin.firestore.Timestamp.now();
  const cutoffDate = new Date(Date.now() - DAYS_UNTIL_DELETE * 24 * 60 * 60 * 1000);
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

  console.log(`Procurando eventos entregues antes de: ${cutoffDate.toLocaleDateString()}`);

  const eventsRef = db.collection("events");
  const snapshot = await eventsRef
    .where("finalPhotosReady", "==", true)
    .where("submittedAt", "<=", cutoffTimestamp)
    .get();

  if (snapshot.empty) {
    console.log("Nenhum evento expirado encontrado hoje.");
    return;
  }

  let totalDeleted = 0;

  for (const eventDoc of snapshot.docs) {
    const eventId = eventDoc.id;
    const photosRef = eventDoc.ref.collection("photos");
    const photosSnapshot = await photosRef.get();

    console.log(`Processando evento expirado: ${eventId} (${photosSnapshot.size} fotos)`);

    for (const photoDoc of photosSnapshot.docs) {
      const publicId = `events/${eventId}/${photoDoc.id}`;

      // Assinatura Cloudinary
      const timestamp = Math.round(Date.now() / 1000);
      const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

      // Deleta do Cloudinary
      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              public_id: publicId,
              api_key: CLOUDINARY_API_KEY,
              timestamp,
              signature,
            }),
          }
        );

        const result = await response.json();
        if (result.result === "ok") {
          console.log(`✓ Deletada do Cloudinary: ${publicId}`);
        } else if (result.result === "not found") {
          console.log(`⚠ Foto não encontrada no Cloudinary (já deletada?): ${publicId}`);
        } else {
          console.warn(`✗ Falha Cloudinary: ${publicId}`, result);
        }
      } catch (err) {
        console.error(`Erro ao deletar do Cloudinary: ${publicId}`, err);
      }

      // Deleta do Firestore
      await photoDoc.ref.delete();
      totalDeleted++;
    }

    // Marca como arquivado
    await eventDoc.ref.update({
      archived: true,
      photosDeletedAt: admin.firestore.Timestamp.now(),
    });

    console.log(`Evento ${eventId} limpo e arquivado.`);
  }

  console.log(`Limpeza concluída! ${totalDeleted} fotos deletadas do Cloudinary e Firestore.`);
}

cleanupExpired().catch((err) => {
  console.error("Erro crítico na limpeza:", err);
  process.exit(1);
});