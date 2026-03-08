import cron from "node-cron";
import Subscription from "../models/subscription.model.js";
import dayjs from "dayjs";
import Notification from "../models/notifications.model.js";

export const startCronJobs = () => {
    cron.schedule('0 0 * * *' , async () => {
        try {
            const now = new Date();

            const result = await Subscription.updateMany(
                {
                    status: 'active',
                    renewalDate: {$lt: now}
                },
                {
                    $set: {status: "expired"}
                }
            );
            if(result.modifiedCount > 0){
                console.log(`Auto-expired ${result.modifiedCount} subscriptions`);
            }
        } catch (error) {
            console.error("Error in auto-expire cron job" + error)
        }
    })
}

const checkUpcomingRenewals = async () => {
    try {
        const targetDate = dayjs().add(3, 'day');

        const startOfDay = targetDate.startOf('day').toDate();
        const endOfDay = targetDate.endOf('day').toDate();

        const upcomingSubscriptions = await Subscription.find({
            status: 'active',
            renewalDate: { $gte: startOfDay, $lte: endOfDay }
        }).populate('user' , 'email');

        if(upcomingSubscriptions.length === 0){
            console.log("No upcoming renewals in the next 3 days.");
            return;
        }

        console.log(`Found ${upcomingSubscriptions.length} subscriptions renewing in the next 3 days.`);

        const notificationsToCreate = upcomingSubscriptions.map(sub => ({
            user: sub.user._id,
            title: "Subscription Renewal Reminder",
            message: `Your subscription to ${sub.name} is renewing on ${dayjs(sub.renewalDate).format('MMMM D, YYYY')}.`,
            type: "renewal_reminder",
            subscription: sub._id,
        }))

        await Notification.insertMany(notificationsToCreate);
        console.log(`Created ${notificationsToCreate.length} renewal reminder notifications.`);
    } catch (error) {
        console.error("Error in upcoming renewals cron job" + error)
    }
}

export const startUpcomingRenewalsCronJob = () => {
    cron.schedule('0 0 * * *' , checkUpcomingRenewals)
    console.log("Started upcoming renewals cron job")
}