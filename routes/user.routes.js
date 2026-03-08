import { Router } from "express";
import { deleteMe, getMe, getUser, getUsers, updateMe } from "../controllers/user.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authorize } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route('/').get(asyncHandler(getUsers))
userRouter.get('/getMe' , authorize , asyncHandler(getMe))
userRouter.route('/:id').get(asyncHandler(getUser))
userRouter.patch('/updateMe' , authorize , asyncHandler(updateMe))
userRouter.delete('/deleteMe' , authorize , asyncHandler(deleteMe))
export default userRouter;
