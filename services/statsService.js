const CallRecord = require('../models/CallRecord');
const AdvancedQueryBuilder = require('../utils/queryBuilder');
const redis = require('../config/redis');
const logger = require('../utils/logger');

class AdvancedStatsService {
  constructor() {
    this.dispositionTypes = [
      'Sales', 'Not Interested', 'Not Qualified', 'DNC', 'Voicemail',
      'Tech Issues', 'DWSPI', 'Unresponsive', 'Hungup', 'Callback',
      'IVR', 'Subsidy', 'Language Barrier', 'Misdialed'
    ];
  }
async getStats(filters = {}) {
  filters = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== null && v !== 'null' && v !== '')
  );

  const cacheKey = `stats:${JSON.stringify(filters)}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const queryBuilder = AdvancedQueryBuilder.forModel(CallRecord)
      .setDateRange(filters)
      .setCampaignFilter(filters.campaign)
      .setPublisherFilter(filters.publisher)
      .setTargetFilter(filters.target)  
      .setBuyerFilter(filters.buyer)    
      // .setDispositionFilter(filters.disposition)
      // .setStatusFilter(filters.status);

    const [totalCounts, dispositionStats, hourlyStats] = await Promise.all([
      this._getTotalCounts(queryBuilder),
      this._getDispositionStats(queryBuilder),
      this._getHourlyStats(queryBuilder)
    ]);

    const result = {
      ...totalCounts,
      dispositions: dispositionStats,
      hourly: hourlyStats,
      summary: this._generateSummary(totalCounts, dispositionStats),
      generatedAt: new Date().toISOString()
    };

    await redis.setex(cacheKey, 120, JSON.stringify(result));

    return result;

  } catch (error) {
    logger.error('Stats calculation failed:', error);
    throw new Error(`Failed to calculate statistics: ${error.message}`);
  }
}

  async _getTotalCounts(queryBuilder) {
    const baseQuery = queryBuilder.disableCache();
    const matchStage = baseQuery._buildFinalQuery();
    
    const [
      totalCalls,
      completedCalls,
      totalDuration,
      avgDuration
    ] = await Promise.all([
      CallRecord.countDocuments(matchStage),
      CallRecord.countDocuments({ ...matchStage, status: 'completed' }),
      this._getTotalDuration(matchStage),
      this._getAverageDuration(matchStage)
    ]);

    return {
      totalCalls,
      completedCalls,
      failedCalls: totalCalls - completedCalls,
      totalDuration: Math.round(totalDuration),
      avgDuration: Math.round(avgDuration),
      completionRate: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0
    };
  }

  async _getDispositionStats(queryBuilder) {
    const matchStage = queryBuilder._buildFinalQuery();
    
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$qc.disposition',
          count: { $sum: 1 },
          totalDuration: { $sum: '$durationSec' },
          avgDuration: { $avg: '$durationSec' }
        }
      },
      {
        $project: {
          _id: 0,
          disposition: '$_id',
          count: 1,
          totalDuration: 1,
          avgDuration: { $round: ['$avgDuration', 2] }
        }
      },
      { $sort: { count: -1 } }
    ];
    const results = await CallRecord.aggregate(pipeline, { 
      maxTimeMS: 30000,
      allowDiskUse: true 
    });

    const total = results.reduce((sum, item) => sum + item.count, 0);
    
    const resultsWithPercentage = results.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0
    }));
    
    return this.dispositionTypes.map(disposition => {
      const stat = resultsWithPercentage.find(r => r.disposition === disposition) || {};
      return {
        disposition,
        count: stat.count || 0,
        totalDuration: stat.totalDuration || 0,
        avgDuration: stat.avgDuration || 0,
        percentage: stat.percentage || 0
      };
    });
  }

  async _getHourlyStats(queryBuilder) {
    const matchStage = queryBuilder._buildFinalQuery();
    
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: '$callTimestamp' },
          count: { $sum: 1 },
          totalDuration: { $sum: '$durationSec' }
        }
      },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          count: 1,
          avgDuration: { $round: [{ $divide: ['$totalDuration', '$count'] }, 2] }
        }
      },
      { $sort: { hour: 1 } }
    ];

    return CallRecord.aggregate(pipeline, { 
      maxTimeMS: 15000,
      allowDiskUse: true 
    });
  }

  async _getTotalDuration(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: '$durationSec' }
        }
      }
    ];
    const result = await CallRecord.aggregate(pipeline, { 
      maxTimeMS: 15000,
      allowDiskUse: true 
    });
    return result[0]?.total || 0;
  }

  async _getAverageDuration(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          average: { $avg: '$durationSec' }
        }
      }
    ];

    // FIXED: Use options object
    const result = await CallRecord.aggregate(pipeline, { 
      maxTimeMS: 15000,
      allowDiskUse: true 
    });
    return result[0]?.average || 0;
  }

  _generateSummary(totalCounts, dispositionStats) {
    const sales = dispositionStats.find(d => d.disposition === 'Sales') || { count: 0 };
    const notInterested = dispositionStats.find(d => d.disposition === 'Not Interested') || { count: 0 };
    
    return {
      conversionRate: totalCounts.completedCalls > 0 
        ? (sales.count / totalCounts.completedCalls) * 100 
        : 0,
      rejectionRate: totalCounts.completedCalls > 0
        ? (notInterested.count / totalCounts.completedCalls) * 100
        : 0,
      efficiencyScore: this._calculateEfficiencyScore(totalCounts, dispositionStats)
    };
  }

  _calculateEfficiencyScore(totalCounts, dispositionStats) {
    const sales = dispositionStats.find(d => d.disposition === 'Sales')?.count || 0;
    const positiveDispositions = ['Sales', 'Callback'].reduce((sum, disp) => {
      return sum + (dispositionStats.find(d => d.disposition === disp)?.count || 0);
    }, 0);

    const negativeDispositions = ['Not Interested', 'DNC', 'Not Qualified'].reduce((sum, disp) => {
      return sum + (dispositionStats.find(d => d.disposition === disp)?.count || 0);
    }, 0);

    if (totalCounts.completedCalls === 0) return 0;

    const positiveRatio = positiveDispositions / totalCounts.completedCalls;
    const negativeRatio = negativeDispositions / totalCounts.completedCalls;
    
    return Math.max(0, Math.min(100, (positiveRatio * 80) - (negativeRatio * 20) + (sales * 0.5)));
  }

  // Real-time dashboard updates
  async getRealTimeStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    
    const queryBuilder = AdvancedQueryBuilder.forModel(CallRecord)
      .setDateRange({ startDate: oneHourAgo.toISOString(), endDate: now.toISOString() });

    const [currentStats, trend] = await Promise.all([
      this.getStats({ startDate: oneHourAgo.toISOString(), endDate: now.toISOString() }),
      this._getTrendStats(oneHourAgo, now)
    ]);

    return {
      ...currentStats,
      trend,
      lastUpdated: now.toISOString()
    };
  }

  async _getTrendStats(start, end) {
    // Compare with previous period for trend analysis
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const previousEnd = new Date(end.getTime() - (end.getTime() - start.getTime()));

    const [current, previous] = await Promise.all([
      this.getStats({ startDate: start.toISOString(), endDate: end.toISOString() }),
      this.getStats({ startDate: previousStart.toISOString(), endDate: previousEnd.toISOString() })
    ]);

    return {
      callsChange: this._calculateChange(current.totalCounts?.totalCalls || 0, previous.totalCounts?.totalCalls || 0),
      conversionChange: this._calculateChange(current.summary?.conversionRate || 0, previous.summary?.conversionRate || 0),
      efficiencyChange: this._calculateChange(current.summary?.efficiencyScore || 0, previous.summary?.efficiencyScore || 0)
    };
  }

  _calculateChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}

module.exports = new AdvancedStatsService();