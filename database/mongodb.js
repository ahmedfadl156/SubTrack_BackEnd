import mongoose from "mongoose";
import { DB_URI , NODE_ENV } from "../config/env.js";

if(!DB_URI){
    throw new Error("Please define the MONGODB_URI in environment variable")
}

const connectToDB = async () => {
    try {
        await mongoose.connect(DB_URI)
        console.log(`Connected To Database On ${NODE_ENV} Mode`)
    } catch (error) {
        console.log("Error While Connecting To DB" , error)
        process.exit(1)
    }
}

export default connectToDB;