import mongoose from "mongoose"
import { SERVER_URL } from "../config/env.js"
import { workflowClient } from "../config/upstash.js"
import Subscription from "../models/subscription.model.js"
import AppError from "../utils/appError.js"
import Payments from "../models/payments.model.js"
import dayjs from "dayjs"

export const createSubscription = async (req , res , next) => {
    // هفتح هنا session جديدة ودى بتضمن ان كل حاجة تتم مع بعض ياكله ياخلاص
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // هنا بنعمل انشاء للاشتراك الجديد
        const newSubscriptions = await Subscription.create([{
            ...req.body,
            user: req.user._id
        }] , {session})

        const subscription = newSubscriptions[0];

        // بعدين بقا هنا هنعمل اول دفه للاشتراك ده فى ال payments history بتاعنا
        await Payments.create([{
            user: req.user._id,
            subscription: subscription._id,
            amount: subscription.price,
            currency: subscription.currency,
            paymentDate: subscription.startDate || new Date()
        }], {session})

        await session.commitTransaction();
        session.endSession();

        const {workflowRunId} = await workflowClient.trigger({
            url: `${SERVER_URL}/api/v1/workflows/subscription/reminder`,
            body: {
                subscriptionId: subscription.id
            },
            headers: {
                'content-type': 'application/json'
            },
            retries: 0,
        })

        res.status(201).json({
            status: "success",
            data: subscription
        })
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error)
    }
}

export const getUserSubscriptions = async (req , res , next) => {
    try {
        const subscriptions = await Subscription.find({user: req.user.id});
        if(!subscriptions){
            next(new AppError("There Is No Subscriptions For This User Right Now , Add Your First One" , 400))
        }
        res.status(200).json({
            status: "success",
            data: subscriptions
        })
    } catch (error) {
        next(error)
    }
}

export const renewSubscription = async (req , res , next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // هنجيب الاشتراك عن طريق ال id
        const subscriptionID = req.params.id;

        const susbcription = await Subscription.findOne({
            _id: subscriptionID,
            user: req.user._id
        }).session(session);

        if(!susbcription){
            next(new AppError("Subscription Not Found!"));
        }

        // تمام قبل التجديد لازم نتأكد ان الاشتراك انتهى فعلا
        if(susbcription.status !== "expired"){
            next(new AppError("You can only renew an expired subscription"));
        }

        const today = dayjs();
        let newRenewalDate;
        
        switch (susbcription.frequency) {
            case 'daily': newRenewalDate = today.add(1, 'day'); break;
            case 'weekly': newRenewalDate = today.add(1, 'week'); break;
            case 'monthly': newRenewalDate = today.add(1, 'month'); break;
            case 'yearly': newRenewalDate = today.add(1, 'year'); break;
            default: newRenewalDate = today.add(1, 'month');
        }

        susbcription.status = "active";
        susbcription.renewalDate = newRenewalDate;

        await susbcription.save({session});

        // نسجل الدفعة الجديدة
        await Payments.create([{
            user: req.user._id,
            subscription: susbcription._id,
            amount: susbcription.price,
            currency: susbcription.currency,
            paymentDate: today.toDate()
        }], {session})

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            status: "success",
            message: "Subscription Renewed Successfully",
            data: susbcription
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error)
    }
}

// فانكشن بنجيب بيها تحليلات لمصروفات المستخدم وتجديداته القادمة
export const getUserSpendingAnalytics = async (req, res, next) => {
    try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const [analytics, upcomingRenewals] = await Promise.all([
            Subscription.aggregate([
                {
                    $match: {
                        user: new mongoose.Types.ObjectId(req.user.id),
                    },
                },
                {
                    $group: {
                        _id: "$category",
                        subscriptionsCount: { $sum: 1 }, // إجمالي كل الاشتراكات في الفئة
                        totalSpent: { $sum: "$price" },  // إجمالي الفلوس المدفوعة في الفئة
                        // هنا بنحسب عدد الاشتراكات النشطة فقط جوه الفئة دي
                        activeCount: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "active"] }, 1, 0]
                            }
                        }
                    },
                },
                {
                    $sort: { totalSpent: -1 },
                },
            ]),
            Subscription.find({
                user: req.user.id, 
                renewalDate: { $gte: today, $lte: nextWeek },
                status: "active"
            }).sort({ renewalDate: 1 }) 
        ]);

        const upcomingCount = upcomingRenewals.length;

        // حساب الإجماليات
        const totalSubscriptions = analytics.reduce((acc, curr) => acc + curr.subscriptionsCount, 0);
        const totalCost = analytics.reduce((acc, curr) => acc + curr.totalSpent, 0);
        
        // هنا جمعنا كل الاشتراكات النشطة من كل الفئات في متغير واحد
        const activeSubscriptions = analytics.reduce((acc, curr) => acc + curr.activeCount, 0);

        const formattedAnalytics = analytics.map(sub => ({
            category: sub._id,
            subscriptionsCount: sub.subscriptionsCount,
            activeCount: sub.activeCount, // ضفناها هنا لو حبيت تعرضها لكل فئة في الفرونت إند
            countPercentage: totalSubscriptions === 0 
                ? '0.0%' 
                : ((sub.subscriptionsCount / totalSubscriptions) * 100).toFixed(1) + '%',
            totalSpent: sub.totalSpent,
            costPercentage: totalCost === 0 
                ? '0.0%' 
                : ((sub.totalSpent / totalCost) * 100).toFixed(1) + "%",
        }));

        res.status(200).json({
            status: "success",
            totalSubscriptions, // إجمالي الاشتراكات كلها (نشط + منتهي)
            activeSubscriptions, // إجمالي الاشتراكات النشطة فقط اللي إنت طلبتها
            totalCost,
            upcomingCount,
            upcomingRenewals, 
            data: formattedAnalytics 
        });
    } catch (error) {
        next(error);
    }
}