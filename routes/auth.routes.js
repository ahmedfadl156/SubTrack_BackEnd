import { Router } from "express";
import {  handleCallback, signIn, signOut, signUp, updatePassword } from "./../controllers/auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import passport from "passport";
import { authorize } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post('/sign-up' , asyncHandler(signUp))
authRouter.post('/sign-in' , asyncHandler(signIn))
authRouter.post('/sign-out' , asyncHandler(signOut))
authRouter.patch('/updatePassword' , authorize , asyncHandler(updatePassword))
// Google
authRouter.get('/google' , passport.authenticate('google' , { scope: ['profile' , 'email'] , session: false }))
authRouter.get('/google/callback' ,
    passport.authenticate('google' , { failureRedirect: `${process.env.CLIENT_URL || "http://localhost:3000"}/sign-in`, session: false }),
    asyncHandler(handleCallback)
)

// Github
authRouter.get('/github' , passport.authenticate('github' , { scope: ['user:email'] , session: false }))
authRouter.get('/github/callback' ,
    passport.authenticate('github' , { failureRedirect: `${process.env.CLIENT_URL || "http://localhost:3000"}/sign-in`, session: false }),
    asyncHandler(handleCallback)
)
export default authRouter;
