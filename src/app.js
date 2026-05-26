import errorHandler from "./utils/helpers/errorHandler.js";
import DbConnect from "./config/dbConnect.js";
import routes from "./routes/index.js";
import CommonResponse from "./utils/helpers/CommonResponse.js";
import express from "express";
import expressFileUpload from "express-fileupload";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { setupDocs } from "./docs/config/head.js";

const app = express();

await DbConnect.conectar();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(expressFileUpload());

routes(app);
setupDocs(app);

// Middleware para lidar com rotas não encontradas (404)
app.use((req, res, next) => {
  return CommonResponse.error(
    res,
    404,
    "resourceNotFound",
    null,
    [{ message: "Rota não encontrada." }],
  );
});

app.use(errorHandler);

export default app;
