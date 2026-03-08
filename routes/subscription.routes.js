import { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import { createSubscription, deleteUserSubscription, getSubscriptionDetails, getUserSpendingAnalytics, getUserSubscriptions, renewSubscription } from "../controllers/subscription.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const subscriptionRouter = Router();

subscriptionRouter.route('/').post(authorize , asyncHandler(createSubscription))
subscriptionRouter.get('/user' , authorize , asyncHandler(getUserSubscriptions));

subscriptionRouter.get('/user/spendingAnalytics' , authorize , asyncHandler(getUserSpendingAnalytics))

// renew subscription route
subscriptionRouter.patch('/:id/renew' , authorize , asyncHandler(renewSubscription))

// delete subscription route
subscriptionRouter.delete('/:id' , authorize , asyncHandler(deleteUserSubscription));

// get subscription details route
subscriptionRouter.get('/:id' , authorize , asyncHandler(getSubscriptionDetails));
export default subscriptionRouter; 