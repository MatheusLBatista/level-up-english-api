import express from "express";
import UserController from "../controllers/UserController.js";
import XpHistoryController from "../controllers/XpHistoryController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/AuthPermission.js";
import avatarUpload from "../middlewares/AvatarUploadMiddleware.js";

const router = express.Router();

const userController = new UserController();
const xpHistoryController = new XpHistoryController();

router
  .get("/users", authMiddleware, authorize("teacher", "admin"), asyncWrapper(userController.list.bind(userController)))
  .get(
    "/users/:id",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(userController.list.bind(userController)),
  )
  .get(
    "/users/:id/xp-history",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(xpHistoryController.list.bind(xpHistoryController)),
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
  .patch(
    "/users/:id/avatar",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    avatarUpload,
    asyncWrapper(userController.updateAvatar.bind(userController)),
  )
  .delete(
    "/users/:id/avatar",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(userController.removeAvatar.bind(userController)),
  )
  .delete(
    "/users/:id",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(userController.delete.bind(userController)),
  );

export default router;
