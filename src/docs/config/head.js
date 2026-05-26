import swaggerUi from "swagger-ui-express";
import { generateOpenAPIDocument } from "../registry.js";

export function setupDocs(app) {
  const spec = generateOpenAPIDocument();
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
  app.get("/api-docs.json", (req, res) => res.json(spec));
}
