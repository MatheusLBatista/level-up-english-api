import express from "express";
import MissionController from "../controllers/MissionController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
const missionController = new MissionController();

router
  .get("/missions", authMiddleware, asyncWrapper(missionController.list.bind(missionController)))
  .get("/missions/:id", authMiddleware, asyncWrapper(missionController.list.bind(missionController)))
  .post("/missions", authMiddleware, asyncWrapper(missionController.create.bind(missionController)))
  .post(
    "/missions/:id/progress",
    authMiddleware,
    asyncWrapper(missionController.progress.bind(missionController)),
  )
  .patch("/missions/:id", authMiddleware, asyncWrapper(missionController.update.bind(missionController)))
  .delete("/missions/:id", authMiddleware, asyncWrapper(missionController.delete.bind(missionController)));

export default router;
