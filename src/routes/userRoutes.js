import express from "express";
import UserController from "../controllers/UserController.js";
import { asyncWrapper } from '../utils/helpers/index.js';
import AuthMiddleware from "../middlewares/AuthMiddleware.js";
import AuthPermission from '../middlewares/AuthPermission.js';

const router = express.Router();

const userController = new UserController();

router
    .get("/users", AuthMiddleware, AuthPermission, asyncWrapper(userController.list.bind(userController)))
    .get("/users/:id", AuthMiddleware, AuthPermission, asyncWrapper(userController.list.bind(userController)))
    .post("/users", AuthMiddleware, AuthPermission, asyncWrapper(userController.create.bind(userController)))
    .patch("/users/:id", AuthMiddleware, AuthPermission, asyncWrapper(userController.update.bind(userController)))
    .put("/users/:id", AuthMiddleware, AuthPermission, asyncWrapper(userController.update.bind(userController)))
    .delete("/users/:id", AuthMiddleware, AuthPermission, asyncWrapper(userController.delete.bind(userController)))

export default router;