import express from "express";
import AuthController from "../controllers/AuthController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();

const authController = new AuthController();

router
  .post("/auth/login", asyncWrapper(authController.login.bind(authController)))
  .post("/auth/refresh", asyncWrapper(authController.refresh.bind(authController)))
  .post("/auth/logout", authMiddleware, asyncWrapper(authController.logout.bind(authController)))
  .post("/auth/revoke/:userId", authMiddleware, asyncWrapper(authController.revoke.bind(authController)));

export default router;
