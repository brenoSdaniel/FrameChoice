// Teste temporário no index.ts ou test.ts
import { deleteOldPhotos } from "./index";

async function testDelete() {
  console.log("Iniciando teste de exclusão de fotos...");
  await deleteOldPhotos();
  console.log("Teste concluído.");
}

testDelete();
