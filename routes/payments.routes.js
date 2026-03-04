import { Router } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import { getTopKPIs } from "../controllers/payments.controller.js";

const paymentRouter = Router();

paymentRouter.get('/getTopKPIs' , authorize , getTopKPIs)

export default paymentRouter;