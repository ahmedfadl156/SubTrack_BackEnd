import { Router } from "express";
import { sendReminders } from "../controllers/workflow.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const workflowRouter = Router();

workflowRouter.all('/subscription/reminder', asyncHandler(sendReminders))

export default workflowRouter;