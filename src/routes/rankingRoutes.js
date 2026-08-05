import express from "express";
import RankingController from "../controllers/RankingController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
const rankingController = new RankingController();

router
  .get("/rankings/global", authMiddleware, asyncWrapper(rankingController.global.bind(rankingController)))
  .get("/rankings/me", authMiddleware, asyncWrapper(rankingController.myClass.bind(rankingController)))
  .get(
    "/rankings/class/:classId",
    authMiddleware,
    asyncWrapper(rankingController.byClass.bind(rankingController)),
  )
  .post("/rankings/refresh", authMiddleware, asyncWrapper(rankingController.refresh.bind(rankingController)));

export default router;
