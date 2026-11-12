import "dotenv/config";
import DbConnect from "../src/config/dbConnect.js";
import UserRepository from "../src/repository/UserRepository.js";

async function main() {
  try {
    await DbConnect.conectar();

    const students = await new UserRepository().findActiveStudentsWithoutConsent();

    if (!students.length) {
      console.log("OK: todos os alunos ativos têm o termo dos responsáveis registrado.");
    } else {
      console.error(`ATENÇÃO: ${students.length} aluno(s) ativo(s) sem termo registrado ou com consentimento revogado:`);
      students.forEach(({ _id, name, class: classId }) => {
        console.error(`- ${_id}  ${name}  turma: ${classId ?? "sem turma"}`);
      });
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Erro ao conferir o termo dos responsáveis:", err);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
    process.exit(process.exitCode || 0);
  }
}

main();
