import mongoose from "mongoose";

const paymentsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
        required: true
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        required: true,
    },
    paymentDate:{
        type: Date,
        default: Date.now
    }
}, {timestamps: true})

const Payments = mongoose.model("payments" , paymentsSchema);
export default Payments;