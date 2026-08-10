import express from "express";
import RankingController from "../controllers/RankingController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";
import authorize from "../middlewares/AuthPermission.js";

const router = express.Router();
const rankingController = new RankingController();

router
  .get(
    "/rankings/global",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(rankingController.global.bind(rankingController)),
  )
  .get(
    "/rankings/me",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(rankingController.myClass.bind(rankingController)),
  )
  .get(
    "/rankings/class/:classId",
    authMiddleware,
    authorize("student", "teacher", "admin"),
    asyncWrapper(rankingController.byClass.bind(rankingController)),
  )
  .post(
    "/rankings/refresh",
    authMiddleware,
    authorize("admin"),
    asyncWrapper(rankingController.refresh.bind(rankingController)),
  );

export default router;
