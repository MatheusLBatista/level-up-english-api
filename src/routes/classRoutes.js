import express from "express";
import ClassController from "../controllers/ClassController.js";
import { asyncWrapper } from "../utils/helpers/index.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
const classController = new ClassController();

router
  .get(
    "/classes",
    authMiddleware,
    asyncWrapper(classController.list.bind(classController)),
  )
  .get(
    "/classes/:id",
    authMiddleware,
    asyncWrapper(classController.list.bind(classController)),
  )
  .post(
    "/classes",
    authMiddleware,
    asyncWrapper(classController.create.bind(classController)),
  )
  .patch(
    "/classes/:id",
    authMiddleware,
    asyncWrapper(classController.update.bind(classController)),
  )
  .delete(
    "/classes/:id",
    authMiddleware,
    asyncWrapper(classController.delete.bind(classController)),
  );

export default router;
