import "dotenv/config";
import DbConnect from "../config/dbConnect.js";
import migrateNotificationIndexes from "./migrateNotificationIndexes.js";

async function main() {
  try {
    await DbConnect.conectar();

    const indexes = await migrateNotificationIndexes();

    console.log(`Índices das notificações: ${indexes.join(", ")}.`);
  } catch (err) {
    console.error("Erro ao migrar os índices das notificações:", err);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
    process.exit(process.exitCode || 0);
  }
}

main();
