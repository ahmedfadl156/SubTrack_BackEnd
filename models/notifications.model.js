import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['renewal_reminder', 'price_increase', 'budget_alert', 'system_update', 'success'],
        default: 'system_update',
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
        default: null
    },
    actionUrl: {
        type: String,
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;