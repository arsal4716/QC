const CallRecord = require('../models/CallRecord');
const CostRecord = require('../models/CostRecord');

exports.getCostStats = async (req, res) => {
  try {
    const deepgramUsage = await CallRecord.aggregate([
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: { $divide: ['$durationSec', 60] } }
        }
      }
    ]);

    const totalProcessed = await CallRecord.countDocuments();
    const deepgramCostPerMinute = 0.0029;
    const openaiCostPerCall = 0.0010; 

    const totalDeepgramCost = deepgramUsage[0]?.totalMinutes * deepgramCostPerMinute || 0;
    const totalOpenAICost = totalProcessed * openaiCostPerCall;
    const totalSpent = totalDeepgramCost + totalOpenAICost;

    const accountBalance = 73;

    res.json({
      success: true,
      stats: {
        totalProcessed,
        avgCostPerMinute: deepgramCostPerMinute,
        avgLLMCost: openaiCostPerCall,
        totalSpent: totalSpent.toFixed(2),
        remainingBalance: accountBalance,
        deepgramUsage: deepgramUsage[0]?.totalMinutes.toFixed(2) || 0,
        openaiUsage: totalProcessed
      },
      paymentHistory: [
        {
          date: '09-31-2025',
          by: 'HLG',
          type: 'Deposit',
          system: 'GC-AgentA523',
          amount: '500',
          status: 'Completed'
        },
      ]
    });
  } catch (error) {
    console.error('Error calculating cost stats:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate cost statistics' });
  }
};