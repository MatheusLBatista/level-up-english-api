import errorHandler from "./utils/helpers/errorHandler.js";
import DbConnect from "./config/dbConnect.js";
import routes from "./routes/index.js";
import CommonResponse from "./utils/helpers/CommonResponse.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { setupDocs } from "./docs/config/head.js";
import uploadsStatic from "./middlewares/UploadsStaticMiddleware.js";
import LocalDiskStorage from "./utils/LocalDiskStorage.js";

const app = express();

// No Render a API fica atrás de proxy: sem isto o req.ip seria o do proxy, e o
// rate limit do login valeria para todo mundo junto.
app.set("trust proxy", 1);

await DbConnect.conectar();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const storage = new LocalDiskStorage();
app.use(storage.publicPath, uploadsStatic(storage));

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
