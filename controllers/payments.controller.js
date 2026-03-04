import Payments from "../models/payments.model.js";
import Subscription from "../models/subscription.model.js";
import mongoose from "mongoose"; // ✅ استورد mongoose

export const getTopKPIs = async (req, res, next) => {
    try {
        // ✅ حوّل userId لـ ObjectId
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        const currentDate = new Date();
        const lastYearDate = new Date();
        lastYearDate.setFullYear(currentDate.getFullYear() - 1);
        const previousYearDate = new Date();
        previousYearDate.setFullYear(currentDate.getFullYear() - 2);

        const [currentYearData, previousYearData, projectedData] = await Promise.all([
            Payments.aggregate([
                {
                    $match: {
                        user: userId, // ✅ دلوقتي ObjectId
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

            Payments.aggregate([
                {
                    $match: {
                        user: userId, // ✅
                        paymentDate: { $gte: previousYearDate, $lte: lastYearDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                        // ✅ شيلنا maxMonth لأن "$monthlyTotal" مش field موجود هنا
                    }
                }
            ]),

            Subscription.aggregate([
                {
                    $match: {
                        user: userId, // ✅
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

        let totalAnnualSpend = 0;
        let highestMonthlySpend = 0;

        currentYearData.forEach(month => {
            totalAnnualSpend += month.montlyTotal;
            if (month.montlyTotal > highestMonthlySpend) {
                highestMonthlySpend = month.montlyTotal;
            }
        });

        const averageMonthlySpend = totalAnnualSpend / 12;

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