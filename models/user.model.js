import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true , "User name is required"],
        trim: true,
        minLength: 2,
        maxLength: 50
    },
    email: {
        type: String,
        required: [true , "Email is required"],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, "Please enter a valid email address"]
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId && !this.githubId;
        },
        minLength: 6,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    githubId: {
        type: String,
        unique: true,
        sparse: true,
    },
    profileImage: String,
    role: {
        type: String,
        enum: ["user" , "admin"],
        default: "user"
    },
    passwordChangedAt: Date
}, {timestamps: true})

userSchema.pre('save' , async function(){
    if(!this.isModified("password")) return ;
    
    this.password = await bcrypt.hash(this.password , 12);
})

userSchema.pre('save' , async function(){
    if(!this.isModified("password") || this.isNew) return ;
    this.passwordChangedAt = Date.now() - 1000;
})

userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
    if(this.passwordChangedAt){
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000 , 10);
        return JWTTimestamp < changedTimestamp;
    }
}

userSchema.methods.correctPassword = async function(candidatePassword , userPassword){
    return await bcrypt.compare(candidatePassword , userPassword);
}

const User = mongoose.model("User" , userSchema);
export default User;