import express from "express";
import AttitudeLogController from "../controllers/AttitudeLogController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
const attitudeLogController = new AttitudeLogController();

router
  .get("/attitude-logs", authMiddleware, asyncWrapper(attitudeLogController.list.bind(attitudeLogController)))
  .get("/attitude-logs/:id", authMiddleware, asyncWrapper(attitudeLogController.list.bind(attitudeLogController)))
  .post("/attitude-logs", authMiddleware, asyncWrapper(attitudeLogController.create.bind(attitudeLogController)));

export default router;
