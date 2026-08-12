import express from "express";
import AttitudeController from "../controllers/AttitudeController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/AuthPermission.js";

const router = express.Router();
const attitudeController = new AttitudeController();

router
  .get(
    "/attitudes",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(attitudeController.list.bind(attitudeController)),
  )
  .get(
    "/attitudes/:id",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(attitudeController.list.bind(attitudeController)),
  )
  .post(
    "/attitudes",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(attitudeController.create.bind(attitudeController)),
  )
  .patch(
    "/attitudes/:id",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(attitudeController.update.bind(attitudeController)),
  )
  .delete(
    "/attitudes/:id",
    authMiddleware,
    authorize("admin"),
    asyncWrapper(attitudeController.delete.bind(attitudeController)),
  );

export default router;
