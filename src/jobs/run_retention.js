import "dotenv/config";
import DbConnect from "../config/dbConnect.js";
import RetentionService from "../service/RetentionService.js";

async function main() {
  try {
    await DbConnect.conectar();

    const summary = await new RetentionService().run();

    console.log(
      `Retenção de ${summary.months} meses (desativados até ${summary.cutoff.toISOString()}): `
      + `${summary.anonymized} anonimizados, ${summary.reapplied} reaplicados após restauração, `
      + `${summary.failed.length} falhas.`,
    );
    summary.failed.forEach(({ user, error }) => console.error(`Falha no usuário ${user}: ${error}`));

    if (summary.failed.length) process.exitCode = 1;
  } catch (err) {
    console.error("Erro ao executar a retenção:", err);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
    process.exit(process.exitCode || 0);
  }
}

main();
