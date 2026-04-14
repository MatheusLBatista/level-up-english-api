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

export default router;