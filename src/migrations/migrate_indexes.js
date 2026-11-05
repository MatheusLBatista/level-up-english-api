import "dotenv/config";
import DbConnect from "../config/dbConnect.js";
import migrateIndexes from "./migrateIndexes.js";

async function main() {
  try {
    await DbConnect.conectar();

    const result = await migrateIndexes();

    for (const [model, indexes] of Object.entries(result)) {
      console.log(`${model}: ${indexes.join(", ")}`);
    }
  } catch (err) {
    console.error("Erro ao criar os índices:", err);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
    process.exit(process.exitCode || 0);
  }
}

main();
