import express from "express";
import MissionController from "../controllers/MissionController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/AuthPermission.js";

const router = express.Router();
const missionController = new MissionController();

router
  .get(
    "/missions",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(missionController.list.bind(missionController)),
  )
  .get(
    "/missions/:id",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(missionController.list.bind(missionController)),
  )
  .post(
    "/missions",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(missionController.create.bind(missionController)),
  )
  .post(
    "/missions/:id/progress",
    authMiddleware,
    authorize("student"),
    asyncWrapper(missionController.progress.bind(missionController)),
  )
  .patch(
    "/missions/:id",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(missionController.update.bind(missionController)),
  )
  .delete(
    "/missions/:id",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(missionController.delete.bind(missionController)),
  );

export default router;
