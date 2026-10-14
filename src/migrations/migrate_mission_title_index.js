import "dotenv/config";
import DbConnect from "../config/dbConnect.js";
import migrateMissionTitleIndex from "./migrateMissionTitleIndex.js";

async function main() {
  try {
    await DbConnect.conectar();

    const { duplicates, droppedLegacyIndex, createdIndex } = await migrateMissionTitleIndex();

    if (duplicates.length) {
      console.error(`${duplicates.length} título(s) repetido(s) na mesma turma; nenhum índice foi alterado:`);
      duplicates.forEach(({ class_id, titles, ids }) => {
        console.error(`  turma ${class_id}: ${titles.join(" | ")} (missões ${ids.join(", ")})`);
      });
      console.error("Renomeie as missões repetidas e rode a migração de novo.");
      process.exitCode = 1;
      return;
    }

    console.log(droppedLegacyIndex ? "Índice title_1 removido." : "Índice title_1 já não existia.");
    console.log(createdIndex ? "Índice class_id_1_title_1 criado." : "Índice class_id_1_title_1 já existia.");
  } catch (err) {
    console.error("Erro ao migrar o índice do título das missões:", err);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
    process.exit(process.exitCode || 0);
  }
}

main();
