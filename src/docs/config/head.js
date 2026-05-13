import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSwaggerOptions() {
  return {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "LevelUp English API",
        version: "1.0.0",
      },
    },
    apis: [
      path.resolve(__dirname, "../../routes/*.js"),
      path.resolve(__dirname, "../../controllers/*.js"),
      path.resolve(__dirname, "../../models/*.js"),
    ],
  };
}

export default getSwaggerOptions;
