import cron from "node-cron";
import Subscription from "../models/subscription.model.js";

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