import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../config/env.js";
import User from "../models/user.model.js";


export const authorize = async (req , res , next) => {
    try {        
        let token;
    
        // check if there a token in the headers
        if(req.cookies.subtracker_jwt){
            token = req.cookies.subtracker_jwt
        }
    
        // if there is no token return
        if(!token){
            const error = new Error('You are not logged in! Please Login to get access');
            error.statusCode = 401;
            throw error;
        }
    
        // verify the token
        const decoded = jwt.verify(token , JWT_SECRET)
        // check if the user still exists
        const user = await User.findById(decoded.userId);
    
        // if no user return error
        if(!user){
            const error = new Error('The user belonging to this token no longer exist');
            error.statusCode = 401;
            throw error;
        }
    
        // if the user there check if he not changed his password
        if(user.changedPasswordAfter(decoded.iat)){
            const error = new Error('User recently changed password! Please Login Again');
            error.statusCode = 401;
            throw error;
        }
    
        // Grant access to protected routes
        req.user = user;
        next()
    } catch (error) {
        next(error)
    }
}