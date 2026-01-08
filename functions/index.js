const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const crypto = require("crypto");

admin.initializeApp();

// CONFIGURAÇÕES — mude para os seus valores
const CLOUDINARY_CLOUD_NAME = "SEU_CLOUD_NAME"; // ex: dabc12345
const CLOUDINARY_API_KEY = "SEU_API_KEY";
const CLOUDINARY_API_SECRET = "SEU_API_SECRET";
const DAYS_UNTIL_DELETE = 90; // dias após a entrega final

exports.cleanupExpiredEvents = functions.pubsub
  .schedule("every 24 hours")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const cutoff = new admin.firestore.Timestamp(
      now.seconds - DAYS_UNTIL_DELETE * 24 * 60 * 60,
      now.nanoseconds
    );

    console.log("Iniciando limpeza de eventos expirados...");

    const eventsRef = admin.firestore().collection("events");
    const expiredEvents = await eventsRef
      .where("finalPhotosReady", "==", true)
      .where("submittedAt", "<=", cutoff)
      .get();

    if (expiredEvents.empty) {
      console.log("Nenhum evento expirado encontrado.");
      return null;
    }

    let deletedPhotos = 0;

    for (const eventDoc of expiredEvents.docs) {
      const eventId = eventDoc.id;
      const photosRef = eventDoc.ref.collection("photos");
      const photosSnapshot = await photosRef.get();

      for (const photoDoc of photosSnapshot.docs) {
        const photoData = photoDoc.data();

        // Public ID no Cloudinary (ajuste se você usa outro padrão)
        const publicId = `events/${eventId}/${photoDoc.id}`;

        // Assinatura para API do Cloudinary
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
                timestamp: timestamp,
                signature: signature,
              }),
            }
          );

          const result = await response.json();
          if (result.result === "ok") {
            console.log(`Foto deletada do Cloudinary: ${publicId}`);
          } else {
            console.warn(`Falha ao deletar do Cloudinary: ${publicId}`, result);
          }
        } catch (err) {
          console.error(`Erro na API Cloudinary: ${publicId}`, err);
        }

        // Deleta do Firestore
        await photoDoc.ref.delete();
        deletedPhotos++;
      }

      // Marca o evento como arquivado
      await eventDoc.ref.update({
        archived: true,
        photosDeletedAt: admin.firestore.Timestamp.now(),
      });

      console.log(`Evento ${eventId} arquivado e ${photosSnapshot.size} fotos deletadas.`);
    }

    console.log(`Limpeza concluída: ${deletedPhotos} fotos deletadas.`);
    return null;
  });