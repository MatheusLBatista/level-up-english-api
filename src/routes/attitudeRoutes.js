import express from "express";
import AttitudeController from "../controllers/AttitudeController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
const attitudeController = new AttitudeController();

router
  .get("/attitudes", authMiddleware, asyncWrapper(attitudeController.list.bind(attitudeController)))
  .get("/attitudes/:id", authMiddleware, asyncWrapper(attitudeController.list.bind(attitudeController)));

export default router;
