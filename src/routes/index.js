// src/routes/index.js

import express from "express";
import logRoutes from "../middlewares/LogRoutesMiddleware.js";
import dotenv from "dotenv";

// Importação das rotas
import userRoutes from "./userRoutes.js";
import authRoutes from "./authRoutes.js";

dotenv.config();

const routes = (app) => {
  // Middleware de log, se ativado
  if (process.env.DEBUGLOG) {
    app.use(logRoutes);
  }

  app.get("/", (req, res) => {
    res.send("API rodando.");
  });

  app.use(express.json(), authRoutes);
  app.use(express.json(), userRoutes);
};

export default routes;
