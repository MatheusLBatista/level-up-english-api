import "dotenv/config";
import mongoose from "mongoose";
import seedUsuario from "./user_seeds.js";
import seedMission from "./mission_seeds.js";
import seedClass from "./class_seeds.js";
import seedRanking from "./ranking_seeds.js";
import seedAttitude from "./attitude_seeds.js";
import seedAttitudeLog from "./attitudeLog_seeds.js";

async function main() {
  try {
    // TODO: rename seeds cascade to english
    await seedUsuario();
    await seedMission();
    await seedClass();
    await seedRanking();
    await seedAttitude();
    await seedAttitudeLog();

    console.log(">>> SEED COMPLETED SUCCESSFULLY! <<<");
  } catch (err) {
    console.error("Erro ao executar SEED:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
}

main();
