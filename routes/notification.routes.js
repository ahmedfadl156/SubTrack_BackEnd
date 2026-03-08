import  { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import { getUserNotifications, markNotificationAsRead } from "../controllers/notification.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const notificationRouter = Router();

// هنا المسئول اننا نجيب كل الاشعارات
notificationRouter.get('/' , authorize , asyncHandler(getUserNotifications));

// هنا هنضيف المسئول عن اننا نخلى الاشعارت بقت مقرؤة
notificationRouter.patch('/mark-as-read' , authorize , asyncHandler(markNotificationAsRead))
export default notificationRouter;