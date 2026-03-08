import Notification from "../models/notifications.model.js";

export const getUserNotifications = async (req , res , next) => {
    try {
        const userId = req.user._id;

        // هنا هنجيب كل النوتفكيشنز الخاصة باليوزر هنجيب منهم بالترتيت اللى اتعمل وهنحدد 50 بس
        const notifications = await Notification.find({
            user: userId
        }).sort({ createdAt: -1 }).limit(50).lean();

        // وهنا هنجيب عدد الاشعارات اللى لسة مقريتهاش عشان نعرضها فى الايقونة بتاعت الاشعارات فى الهيدر مثلا
        const unreadCount = await Notification.countDocuments({
            user: userId,
            isRead: false
        })

        // هنا هنبعت الرد للفرونت
        res.status(200).json({
            status: "success",
            data: {
                notifications,
                unreadCount
            }
        })
    } catch (error) {
        console.error("Error fetching user notifications:", error);
        next(error)
    }
}

export const markNotificationAsRead = async (req , res , next) => {
    try {
        const userId = req.user._id;
        const { notificationId } = req.body;

        if(notificationId){
            const notification = await Notification.findOneAndUpdate(
                {_id: notificationId, user: userId},
                {$set: {isRead: true}},
                {new: true}
            )

            if(!notification){
                return res.status(400).json({
                    status: "fail",
                    message: "No Notification Found"
                })
            }

            return res.status(200).json({
                status: "success",
                data: notification
            })
        }else{
            await Notification.updateMany(
                {user: userId, isRead: false},
                {$set: {isRead: true}}
            )
            return res.status(200).json({
                status: "success",
                message: "All notifications marked as read"
            })
        }
    } catch (error) {
        console.error("Error marking notification as read:", error);
        next(error)
    }
}