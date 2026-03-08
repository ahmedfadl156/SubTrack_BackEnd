import dayjs from "dayjs";
import Payments from "../models/payments.model.js";
import Subscription from "../models/subscription.model.js";
import mongoose from "mongoose"; 
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "../config/env.js";

// AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const getTopKPIs = async (req, res, next) => {
    try {
        // نجيب اول حاجة الايدى بتاع اليوزر عشان نحسبله
        const userId = req.user._id;

        // هنجيب هنا معلومات السنين اللى محتاجينها فى البيانات هنا السنة اللى فاتت و السنة اللى قبلها و كمان البيانات المتوقعة للشهر الجاى
        const currentDate = new Date();
        const lastYearDate = new Date();
        lastYearDate.setFullYear(currentDate.getFullYear() - 1);
        const previousYearDate = new Date();
        previousYearDate.setFullYear(currentDate.getFullYear() - 2);

        const [currentYearData, previousYearData, projectedData] = await Promise.all([
            // First Query => وهنا هنجيب بيانات السنة اللى فاتت و هنقسمها على شهور عشان نجيب كل شهر صرف كام
            Payments.aggregate([
                {
                    $match: {
                        user: userId, 
                        paymentDate: { $gte: lastYearDate, $lte: currentDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            month: { $month: "$paymentDate" },
                            year: { $year: "$paymentDate" }
                        },
                        montlyTotal: { $sum: "$amount" }
                    }
                }
            ]),

            // Second Query => وهنا هنجيب بيانات السنة اللى قبلها عشان نقدر نقارن بيها
            Payments.aggregate([
                {
                    $match: {
                        user: userId,
                        paymentDate: { $gte: previousYearDate, $lte: lastYearDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                        maxMonthly: { $max: "$monthlyTotal" }
                    }
                }
            ]),

            // Third Query => وهنا هنجيب البيانات المتوقعة للشهر الجاى بناء على الاشتراكات اللى عنده و هنحول كل الاشتراكات دى لتكلفة شهرية عشان نقدر نجمعهم و نطلع التكلفة المتوقعة للشهر الجاى
            Subscription.aggregate([
                {
                    $match: {
                        user: userId,
                        status: "active"
                    }
                },
                {
                    $addFields: {
                        normalizedMonthlyCost: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$frequency", "monthly"] }, then: "$price" },
                                    { case: { $eq: ["$frequency", "yearly"] }, then: { $divide: ["$price", 12] } },
                                    { case: { $eq: ["$frequency", "weekly"] }, then: { $multiply: ["$price", 4.33] } },
                                    { case: { $eq: ["$frequency", "daily"] }, then: { $multiply: ["$price", 30] } },
                                ],
                                default: "$price"
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalProjected: { $sum: "$normalizedMonthlyCost" }
                    }
                }
            ])
        ]);

        // هنا بقا هنظبط الداتا عشان نرجعها بشكل مرتب و سهل نستخدمه فى الفيوز بتاعتنا
        // بنحسب هنا تكلفة كل الشهور وكمان اعلى شهر انتصرف فيه كام
        let totalAnnualSpend = 0;
        let highestMonthlySpend = 0;

        currentYearData.forEach(month => {
            totalAnnualSpend += month.montlyTotal;
            if (month.montlyTotal > highestMonthlySpend) {
                highestMonthlySpend = month.montlyTotal;
            }
        });

        // هنا بنحسب الافريدج
        const averageMonthlySpend = totalAnnualSpend / 12;

        // هنا عاملين فانكشن نحسب من خلالها النسبة المئوية للتغير بين السنة دى و السنة اللى فاتت
        const calculatePercentage = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return (((current - previous) / previous) * 100).toFixed(1);
        };

        const prevYearTotal = previousYearData.length > 0 ? previousYearData[0].total : 0;
        const prevYearAvg = prevYearTotal / 12;
        const projectedNextMonth = projectedData.length > 0 ? projectedData[0].totalProjected : 0;

        res.status(200).json({
            status: "success",
            data: {
                totalAnnualSpend: {
                    value: totalAnnualSpend,
                    percentageChange: calculatePercentage(totalAnnualSpend, prevYearTotal)
                },
                averageMonthlySpend: {
                    value: averageMonthlySpend,
                    percentageChange: calculatePercentage(averageMonthlySpend, prevYearAvg)
                },
                highestMonthlyPeak: {
                    value: highestMonthlySpend,
                    percentageChange: null
                },
                projectedNextMonth: {
                    value: projectedNextMonth,
                    isForecast: true
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Function To Get Monthly Spend Data For Chart
export const getSpendingTrends = async (req , res , next) => {
    try {
        const userId = req.user._id;

        const endOfCurrentPeriod = dayjs().endOf('month');
        const startOfCurrentPeriod = endOfCurrentPeriod.subtract(11, 'month').startOf('month');

        const endOfPreviousPeriod = startOfCurrentPeriod.subtract(1, 'millisecond');
        const startOfPreviousPeriod = endOfPreviousPeriod.subtract(11, 'year');

        // نعمل هنا بقا ال queries
        const [currentPeriodData , previousPeriodData] = await Promise.all([
            Payments.aggregate([
                {
                    $match: {
                        user: userId,
                        paymentDate: { $gte: startOfCurrentPeriod.toDate(), $lte: endOfCurrentPeriod.toDate() }
                    }
                },
                {
                    $group:{
                        _id: {
                            month: {$month: "$paymentDate"},
                            year: {$year: "$paymentDate"}
                        },
                        total: {$sum: "$amount"}
                    }
                }
            ]),

            Payments.aggregate([
                {
                    $match: {
                        user: userId,
                        paymentDate: { $gte: startOfPreviousPeriod.toDate(), $lte: endOfPreviousPeriod.toDate() },
                    }
                },
                {
                    $group: {
                        _id: {
                            month: { $month: "$paymentDate" },
                            year: { $year: "$paymentDate" }
                        },
                        total: { $sum: "$amount" }
                    }
                }
            ])
        ]);

        // هنعمل هنا array عشان نعالج مشكلة الفرونت اند فى عرض بيانات ال chart
        const chartData = [];

        for(let i =0 ; i < 12 ; i++){
            const targetMonth = startOfCurrentPeriod.add(i, 'month');
            const targetMonthNum = targetMonth.month() + 1;
            const targetYearNum = targetMonth.year();

            const prevTargetMonth = targetMonth.subtract(1, 'year');
            const prevTargetMonthNum = prevTargetMonth.month() + 1;
            const prevTargetYearNum = prevTargetMonth.year();

            const currentData = currentPeriodData.find(
                d => d._id.month === targetMonthNum && d._id.year === targetYearNum
            );

            const previousData = previousPeriodData.find(
                d => d._id.month === prevTargetMonthNum && d._id.year === prevTargetYearNum
            );

            chartData.push({
                month: targetMonth.format("MMM"),
                year: targetYearNum,
                currentPeriod: currentData ? currentData.total : 0,
                previousYear: previousData ? previousData.total : 0
            });
        }

        res.status(200).json({
            status: "success",
            data: chartData
        })

    } catch (error) {
        next(error);
    }
}

const generateContentWithRetry = async (model, prompt, maxRetries = 3) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            return result;
        } catch (error) {
            lastError = error;
            
            const is429Error = error.message?.includes('429') || 
                                error.message?.includes('Too Many Requests') ||
                                error.message?.includes('quota');
            
            if (is429Error && attempt < maxRetries) {
                const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                console.log(`Rate limit hit. Retrying after ${delayMs}ms (Attempt ${attempt}/${maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else if (is429Error) {
                throw new Error(`Gemini API quota exceeded after ${maxRetries} retries. Please try again later.`);
            } else {
                throw error;
            }
        }
    }
    
    throw lastError;
};

// هنا بقا هنعمل الفانكشن اللى هتحلل المصاريف بتاعت اليوزر كاملة بال ai وتطلع اقتراحات مناسبة عشان يقدر بيها يوفر مصاريفه
export const getAIInsights = async (req , res , next) => {
    try {
        // اول حاجة هنجيب الايدى بتاع اليوزر عشان نحلل لكل يوزر
        const userId = req.user._id;

        // بعدين هنجيب الاشتراكات النشطة لليوزر لو فيه طبعا لو مفيش خلاص بقا يبقا يشترك اول ميقرفناش
        const activeSubscriptions = await Subscription.find({user: userId , status: "active"})
        .select('name price currency frequency category startDate').lean();

        if(!activeSubscriptions || activeSubscriptions.length === 0){
            return res.status(200).json({
                status: "success",
                data:{
                    totalPotentioalSavings: 0,
                    suggestions: []
                }
            })
        };

        const prompt = `
            You are an expert financial advisor specializing in SaaS and subscription optimization. 
            Analyze the following list of active subscriptions for a user:
            
            ${JSON.stringify(activeSubscriptions)}

            Your goal is to find ways for the user to save money. Look for:
            1. Duplicate services in the same category (e.g., having both Spotify and Apple Music, or Netflix and Hulu). Suggest canceling one.
            2. Opportunities to upgrade from 'monthly' to 'yearly' billing to save money (assume standard industry savings of 15-20% for annual plans).
            3. Expensive subscriptions that might have cheaper alternatives.

            IMPORTANT: You must respond ONLY with a valid JSON object. Do not include markdown formatting like \`\`\`json. 
            The JSON must strictly follow this structure:
            {
                "totalPotentialSavings": <number_representing_total_annual_savings>,
                "suggestions": [
                    {
                        "actionType": "<'cancel' | 'switch_annual' | 'downgrade'>",
                        "serviceName": "<name_of_the_service>",
                        "reason": "<short_convincing_reason>",
                        "estimatedAnnualSavings": <number>
                    }
                ]
            }
        `;

        // جهزنا البرومبت هنجيب بقا المودل اللى هنشتغل عليه ويحللنا الكلام دا كله
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: 'application/json',
            }
        })

        // هنا بقا هنطلع النتيجة ونظبطها فى شكل حلو عشان نبعتها مظبوطة للفرونت مع retry logic
        const result = await generateContentWithRetry(model, prompt);
        const aiResponseText = result.response.text();

        const aiInsights = JSON.parse(aiResponseText);

        res.status(200).json({
            status: "success",
            data: aiInsights
        });
    } catch (error) {
        console.error("AI Analysis Error:", error);
        next(error);
    }
}


export const getBillingHistory = async (req , res , next) => {
    try {
        const subscriptionId = req.params.subscriptionId;
        const userId = req.user._id;

        // نتأكد ان الاشتراك ده فعلا موجود و بيتبع اليوزر ده
        const subscription = await Subscription.findOne({_id: subscriptionId, user: userId});

        if(!subscription){
            return res.status(404).json({
                status: "fail",
                message: "Subscription Not Found"
            })
        }

        // هنا هنجيب كل المدفوعات اللى اتعملت للاشتراك ده و هنرتبهم من الاحدث للاقدم
        const payments = await Payments.find({subscription: subscriptionId})
        .sort({paymentDate: -1})
        .select("amount currency paymentDate") 
        .limit(12)
        .lean();
        
        res.status(200).json({
            status: "success",
            data: payments
        });
    } catch (error) {
        console.error("Error fetching billing history:", error);
        next(error);
    }
}