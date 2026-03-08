import { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import { createSubscription, deleteUserSubscription, getSubscriptionDetails, getUserSpendingAnalytics, getUserSubscriptions, renewSubscription } from "../controllers/subscription.controller.js";

const subscriptionRouter = Router();

subscriptionRouter.route('/').post(authorize , createSubscription)
subscriptionRouter.get('/user' , authorize , getUserSubscriptions);

subscriptionRouter.get('/user/spendingAnalytics' , authorize , getUserSpendingAnalytics)

// renew subscription route
subscriptionRouter.patch('/:id/renew' , authorize , renewSubscription)

// delete subscription route
subscriptionRouter.delete('/:id' , authorize , deleteUserSubscription);

// get subscription details route
subscriptionRouter.get('/:id' , authorize , getSubscriptionDetails);
export default subscriptionRouter; 