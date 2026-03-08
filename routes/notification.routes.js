import  { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import { getUserNotifications, markNotificationAsRead } from "../controllers/notification.controller.js";
const notificationRouter = Router();

// هنا المسئول اننا نجيب كل الاشعارات
notificationRouter.get('/' , authorize , getUserNotifications);

// هنا هنضيف المسئول عن اننا نخلى الاشعارت بقت مقرؤة
notificationRouter.patch('/mark-as-read' , authorize , markNotificationAsRead)
export default notificationRouter;