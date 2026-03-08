import mongoose from "mongoose"
import User from "../models/user.model.js";
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_COOKIES_EXPIRES_IN, JWT_EXPIRES_IN, JWT_SECRET, NODE_ENV, SERVER_URL } from "../config/env.js";
import GoogleStrategy from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import passport from "passport";
import AppError from "../utils/appError.js";

const sendToken = (user , token , statusCode , res) => {
    const cookieOptions = {
        expires: new Date(Date.now() + JWT_COOKIES_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: "strict"
    }

    if(NODE_ENV === 'production'){
        cookieOptions.secure = true;
    }

    res.cookie('subtracker_jwt' , token , cookieOptions)
    res.status(statusCode).json({
        status: "success",
        data:{ 
            user
        }
    })
}

export const handleCallback = (req, res, next) => {
    try {
        const token = jwt.sign({ userId: req.user._id , role: req.user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        const cookieOptions = {
            expires: new Date(Date.now() + JWT_COOKIES_EXPIRES_IN * 24 * 60 * 60 * 1000),
            httpOnly: true,
            sameSite: "strict"
        };

        if (NODE_ENV === "production") {
            cookieOptions.secure = true;
        }

        res.cookie("subtracker_jwt", token, cookieOptions);
        res.redirect(process.env.CLIENT_URL || "http://localhost:3000");
    } catch (error) {
        next(error);
    }
};

// Signup Function
export const signUp = async (req , res , next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        //  Get the user data from the body
        const {name , email , password} = req.body;

        // Check that all data is exist and right
        if(!name || !email || !password){
            const error = new Error("Please insert all required fields");
            error.statusCode = 400;
            throw error;
        }

        // Check the user email not exist
        const existingUser = await User.findOne({email}).session(session);
        if(existingUser){
            const error = new Error('User already exists');
            error.statusCode = 409;
            throw error;
        }

        // if the user not exist hash the password
        const salt = await bcrypt.genSalt(12)
        const hashedPassword = await bcrypt.hash(password , salt);

        // Create the user in database
        const newUsers = await User.create([{
            name,
            email,
            password: hashedPassword
        }] , {session})
        
        // create the jwt token
        const token = jwt.sign({userId: newUsers[0]._id , role: newUsers[0].role} , JWT_SECRET , {expiresIn: JWT_EXPIRES_IN});

        // Commit the transaction and end session
        await session.commitTransaction();

        // Send the data to the user
        sendToken(newUsers[0] , token , 201 , res)
    } catch (error) {
        await session.abortTransaction();
        next(error)
    } finally {
        session.endSession();
    }
}

export const signIn = async (req , res , next) => {
    try {
        //  Get the email and password from the body
        const {email , password} = req.body;

        // Check that user is exist
        const user = await User.findOne({email});

        // If user not exist
        if(!user){
            const error = new Error('User Not Exist Please Sign Up');
            error.statusCode = 404;
            throw error;
        }

        // Check if the password for that user is valid
        const isPasswordValid = await bcrypt.compare(password , user.password);

        // if the password not valid throw error
        if(!isPasswordValid){
            const error = new Error('Email Or Password Is Not Correct');
            error.statusCode = 401;
            throw error;
        }

        //  if the data valid create a jwt token and send the response
        const token = jwt.sign({userId: user._id , role: user.role} , JWT_SECRET , {expiresIn: JWT_EXPIRES_IN});

        sendToken(user , token , 200 , res)
    } catch (error) {
        next(error)
    }
}

export const signOut = async (req , res) => {
    res.clearCookie('subtracker_jwt' , {
        httpOnly: true,
        sameSite: 'strict',
        secure: NODE_ENV === 'production'
    })
    res.status(200).json({
        status: "success",
        message: "User Signed Out Successfully."
    })
}


export const updatePassword = async (req , res , next) => {
    try {
        const user = await User.findById(req.user._id).select("+password");

        if(!user){
            return next(new AppError("No user found by this ID" , 404))
        }

        const correctOldPassword = await user.correctPassword(req.body.oldPassword , user.password);

        if(!correctOldPassword){
            return next(new AppError("The given password is incorrect" , 401))
        }

        user.password = req.body.newPassword;
        await user.save();

        const token = jwt.sign({userId: user._id , role: user.role} , JWT_SECRET , {expiresIn: JWT_EXPIRES_IN});
        sendToken(user , token , 200 , res)
    } catch (error) {
        next(new AppError("There Is Error While Updating User Password: " + error.message , 500))
    }
}

// فانكشن استعملها فى تسجيل الدخول باستعمال جوجل
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `${SERVER_URL || "http://localhost:5500"}/api/v1/auth/google/callback`
},
    async (accessToken , refreshToken , profile , done) => {
        try {
            // فى الاول ابحث بال googleId موجود ولال لا
            let user = await User.findOne({googleId: profile.id});

            //  لو المستخدم موجود انه تمام وارجع معلومات اليوزر
            if(user){
                return done(null , user)
            }

            // لو ملقتش ادور بالايميل عشان لو كان مسجل بالاميل يدوى
            const userEmail = profile.emails[0].value;
            user = await User.findOne({email: userEmail})

            if(user){
                user.googleId = profile.id;
                if(!user.profileImage) user.profileImage = profile.photos[0].value;
                await user.save();
                return done(null , user);
            }

            // لو مفيش بقا كل ده دلوقتى هنعمل يوزر جديد ونحفظه عندنا
            const newUser = await User.create({
                googleId: profile.id,
                name: profile.displayName,
                email: userEmail,
                profileImage: profile.photos[0].value
            })

            return done(null , newUser)

        } catch (error) {
            console.log("Error in Google Strategy", error)
            return done(error , null)
        }
    }
))

// فانكشن استعملها فى تسجيل الدخول باستعمال جيت هاب
passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: `${SERVER_URL || "http://localhost:5500"}/api/v1/auth/github/callback`,
    scope: ['user:email'],
    allRawEmails: true 
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let userEmail = null;
            if (profile.emails && profile.emails.length > 0) {
                userEmail = profile.emails.find(email => email.primary === true)?.value || profile.emails[0].value;
            }

            if (!userEmail) {
                return done(new Error("Email is required but not provided by GitHub"), null);
            }

            let user = await User.findOne({ githubId: profile.id });

            if (user) {
                return done(null, user);
            }

            user = await User.findOne({ email: userEmail });

            if (user) {
                user.githubId = profile.id;
                if (!user.profileImage) user.profileImage = profile._json.avatar_url;
                await user.save();
                return done(null, user);
            }

            const newUser = await User.create({
                githubId: profile.id,
                name: profile.displayName || profile.username,
                email: userEmail,
                profileImage: profile._json.avatar_url
            });

            return done(null, newUser);

        } catch (error) {
            console.log("Error in GitHub Strategy", error);
            return done(error, null);
        }
    }
));