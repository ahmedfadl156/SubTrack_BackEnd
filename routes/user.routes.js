import { Router } from "express";
import { deleteMe, getMe, getUser, getUsers, updateMe } from "../controllers/user.controller.js";
import { authorize } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route('/').get(getUsers)
userRouter.get('/getMe' , authorize , getMe)
userRouter.route('/:id').get(getUser)
userRouter.patch('/updateMe' , authorize , updateMe)
userRouter.delete('/deleteMe' , authorize , deleteMe)
export default userRouter;
