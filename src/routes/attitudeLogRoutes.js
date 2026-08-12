import express from "express";
import AttitudeLogController from "../controllers/AttitudeLogController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/AuthPermission.js";

const router = express.Router();
const attitudeLogController = new AttitudeLogController();

router
  .get(
    "/attitude-logs",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(attitudeLogController.list.bind(attitudeLogController)),
  )
  .get(
    "/attitude-logs/:id",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(attitudeLogController.list.bind(attitudeLogController)),
  )
  .post(
    "/attitude-logs",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(attitudeLogController.create.bind(attitudeLogController)),
  )
  .patch(
    "/attitude-logs/:id",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(attitudeLogController.update.bind(attitudeLogController)),
  )
  .delete(
    "/attitude-logs/:id",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(attitudeLogController.delete.bind(attitudeLogController)),
  );

export default router;
