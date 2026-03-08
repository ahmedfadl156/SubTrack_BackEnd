import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import mongoose from "mongoose";

export const getUsers = async (req , res , next) => {
    const users = await User.find();

    res.status(200).json({
        status: "success",
        count: users.length,
        data: users
    })
}

export const getUser = async (req , res , next) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)){
        return next(new AppError("Invalid user ID format" , 400));
    }

    const user = await User.findById(req.params.id);

    if(!user){
        return next(new AppError("No User found with this ID" , 404))
    };

    res.status(200).json({
        status: "success",
        data: user
    })
}

export const getMe = async (req , res , next) => {
    try {
        const user = await User.findById(req.user.id);
        if(!user){
            return next(new AppError("No user found by this ID" , 404))
        }
        res.status(200).json({
            status: "success",
            data: user
        })
    } catch (error) {
        next(new AppError("There Is Error While Getting User Info: " + error.message , 500))
    }
}


export const updateMe = async (req , res , next) => {
    try {
        const allowedFields = ['name' , 'eamil'];
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every(update => allowedFields.includes(update));

        if(!isValidOperation){
            return next(new AppError("Invalid updates! Only name, email, and password can be updated." , 400))
        }

        const user = await User.findById(req.user._id);

        if(!user){
            return next(new AppError("No user found by this ID" , 404))
        }

        updates.forEach(update => user[update] = req.body[update]);
        await user.save();

        const updatedUser = await User.findByIdAndUpdate(req.user._id, user, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            status: "success",
            data: updatedUser
        })
    } catch (error) {
        next(new AppError("There Is Error While Updating User Info: " + error.message , 500))
    }
}

export const deleteMe = async (req , res , next) => {
    try {
        const user = await User.findByIdAndDelete(req.user._id);
        if(!user){
            return next(new AppError("No user found by this ID" , 404))
        }
        res.status(204).json({
            status: "success",
            data: null
        })
    } catch (error) {
        next(new AppError("There Is Error While Deleting User: " + error.message , 500))
    }
}