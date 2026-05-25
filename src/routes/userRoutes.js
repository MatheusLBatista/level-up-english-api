import express from "express";
import UserController from "../controllers/UserController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();

const userController = new UserController();

router
  .get("/users", authMiddleware, asyncWrapper(userController.list.bind(userController)))
  .get("/users/:id", authMiddleware, asyncWrapper(userController.list.bind(userController)))
  .post("/users", authMiddleware, asyncWrapper(userController.criar.bind(userController)))
  .put("/users/:id", authMiddleware, asyncWrapper(userController.atualizar.bind(userController)))
  .delete("/users/:id", authMiddleware, asyncWrapper(userController.deletar.bind(userController)));

export default router;
