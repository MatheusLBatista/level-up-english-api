import express from "express";
import AuthController from "../controllers/AuthController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/AuthPermission.js";
import { loginLimiters, forgotPasswordLimiter, resetPasswordLimiter } from "../middlewares/RateLimitMiddleware.js";

const router = express.Router();

const authController = new AuthController();

router
  .post("/auth/login", ...loginLimiters, asyncWrapper(authController.login.bind(authController)))
  .post(
    "/auth/register-student",
    authMiddleware,
    authorize("teacher", "admin"),
    asyncWrapper(authController.registerStudent.bind(authController)),
  )
  .post(
    "/auth/register-teacher",
    authMiddleware,
    authorize("admin"),
    asyncWrapper(authController.registerTeacher.bind(authController)),
  )
  .post("/auth/refresh", asyncWrapper(authController.refresh.bind(authController)))
  .post("/auth/forgot-password", forgotPasswordLimiter, asyncWrapper(authController.forgotPassword.bind(authController)))
  .post("/auth/reset-password", resetPasswordLimiter, asyncWrapper(authController.resetPassword.bind(authController)))
  .patch("/auth/change-password", authMiddleware, asyncWrapper(authController.changePassword.bind(authController)))
  .post("/auth/logout", asyncWrapper(authController.logout.bind(authController)))
  .post(
    "/auth/revoke/:userId",
    authMiddleware,
    authorize("admin"),
    asyncWrapper(authController.revoke.bind(authController)),
  );

export default router;
