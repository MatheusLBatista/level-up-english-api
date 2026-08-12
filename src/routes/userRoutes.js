import express from "express";
import UserController from "../controllers/UserController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/AuthPermission.js";

const router = express.Router();

const userController = new UserController();

router
  .get("/users", authMiddleware, authorize("teacher", "admin"), asyncWrapper(userController.list.bind(userController)))
  .get(
    "/users/:id",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(userController.list.bind(userController)),
  )
  .post("/users", authMiddleware, authorize("teacher", "admin"), asyncWrapper(userController.create.bind(userController)))
  .post(
    "/users/recalculate-levels",
    authMiddleware,
    authorize("admin"),
    asyncWrapper(userController.recalculateLevels.bind(userController)),
  )
  .patch(
    "/users/:id",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(userController.update.bind(userController)),
  )
  .delete(
    "/users/:id",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(userController.delete.bind(userController)),
  );

export default router;
