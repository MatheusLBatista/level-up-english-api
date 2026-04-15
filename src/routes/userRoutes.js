import express from "express";
import UserController from "../controllers/UserController.js";
import { asyncWrapper } from '../utils/helpers/index.js';

const router = express.Router();

const userController = new UserController();

router
    .get("/users", asyncWrapper(userController.list.bind(userController)))
    .get("/users/:id", asyncWrapper(userController.list.bind(userController)))

export default router;