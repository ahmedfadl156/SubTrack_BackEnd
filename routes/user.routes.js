import { Router } from "express";
import { getMe, getUser, getUsers } from "../controllers/user.controller.js";
import { authorize } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route('/').get(getUsers)
userRouter.get('/getMe' , authorize , getMe)
userRouter.route('/:id').get(getUser)
export default userRouter;
