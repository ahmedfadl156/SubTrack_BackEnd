import { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import { getAIInsights, getBillingHistory, getSpendingTrends, getTopKPIs } from "../controllers/payments.controller.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const paymentRouter = Router();

paymentRouter.get('/getTopKPIs' , authorize , getTopKPIs)
paymentRouter.get('/getSpendingTrends' 
    , authorize 
    , cacheMiddleware('analytics' , 600)
    , getSpendingTrends
)
paymentRouter.get("/ai-insights" , authorize , cacheMiddleware("ai-insights" , 86400) , getAIInsights)
paymentRouter.get("/:subscriptionId/billing-history" , authorize , cacheMiddleware("payment" , 3600) , getBillingHistory)
export default paymentRouter;