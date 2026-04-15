import express from "express";
import logRoutes from "../middlewares/LogRoutesMiddleware.js";
import dotenv from "dotenv";

import userRoutes from "./userRoutes.js";

dotenv.config();

const routes = (app) => {
    // Middleware de log, se ativado
    if (process.env.DEBUGLOG) {
        app.use(logRoutes);
    }

    app.get("/", (req, res) => {
        res.redirect("/docs");
    });

    // Rota raiz simples
    app.get("/", (req, res) => {
        res.send("API rodando.");
    });

    app.use(express.json(), 
    userRoutes
  );
    
};

export default routes;
