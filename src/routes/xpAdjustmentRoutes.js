import express from "express";
import XpAdjustmentController from "../controllers/XpAdjustmentController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/AuthPermission.js";

const router = express.Router();
const xpAdjustmentController = new XpAdjustmentController();

router.post(
  "/xp-adjustments",
  authMiddleware,
  authorize("teacher", "admin"),
  asyncWrapper(xpAdjustmentController.create.bind(xpAdjustmentController)),
);

export default router;
