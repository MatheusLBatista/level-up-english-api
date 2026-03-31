import "dotenv/config";
import seedUsuario from "./user_seeds.js";
import seedGrupo from "./seed_grupo.js";
import seedRotas from "./seed_rota.js";
 
async function main() {
    try {
      await seedRotas();
      await seedGrupo();
      await seedUsuario();

      console.log(">>> SEED FINALIZADO COM SUCESSO! <<<");
    } catch (err) {
      console.error("Erro ao executar SEED:", err);

    } finally {
      mongoose.connection.close();
      process.exit(0);
    }
  }
  
  main();
  
