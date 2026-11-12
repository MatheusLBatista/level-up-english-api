import "dotenv/config";
import DbConnect from "../config/dbConnect.js";
import backfillDeactivatedAt from "./backfillDeactivatedAt.js";

async function main() {
  try {
    await DbConnect.conectar();

    const updated = await backfillDeactivatedAt();

    console.log(`Usuários desativados com deactivated_at preenchido: ${updated}.`);
  } catch (err) {
    console.error("Erro ao preencher deactivated_at:", err);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
    process.exit(process.exitCode || 0);
  }
}

main();
