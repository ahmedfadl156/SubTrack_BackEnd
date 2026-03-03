import { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import { createSubscription, getUserSpendingAnalytics, getUserSubscriptions, renewSubscription } from "../controllers/subscription.controller.js";

const subscriptionRouter = Router();

subscriptionRouter.route('/').post(authorize , createSubscription)
subscriptionRouter.get('/user' , authorize , getUserSubscriptions);

subscriptionRouter.get('/user/spendingAnalytics' , authorize , getUserSpendingAnalytics)

// renew subscription route
subscriptionRouter.patch('/:id' , authorize , renewSubscription)
export default subscriptionRouter;