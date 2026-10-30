import express from "express";
import NotificationController from "../controllers/NotificationController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/AuthPermission.js";

const router = express.Router();
const notificationController = new NotificationController();

router
  .get(
    "/notifications",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(notificationController.list.bind(notificationController)),
  )
  .get(
    "/notifications/unread-count",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(notificationController.unreadCount.bind(notificationController)),
  )
  .patch(
    "/notifications/read-all",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(notificationController.markAllAsRead.bind(notificationController)),
  )
  .patch(
    "/notifications/:id/read",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(notificationController.markAsRead.bind(notificationController)),
  );

export default router;
