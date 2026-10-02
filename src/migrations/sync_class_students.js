import "dotenv/config";
import DbConnect from "../config/dbConnect.js";
import syncClassStudents from "./syncClassStudents.js";

async function main() {
  try {
    await DbConnect.conectar();

    const { changedClasses, orphanStudents } = await syncClassStudents();

    console.log(`${changedClasses} turma(s) corrigida(s).`);

    if (orphanStudents) {
      console.warn(`${orphanStudents} aluno(s) apontam para turma inexistente; não foram alterados.`);
    }
  } catch (err) {
    console.error("Erro ao sincronizar Class.students:", err);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
    process.exit(process.exitCode || 0);
  }
}

main();
