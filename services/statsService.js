const CallRecord = require("../models/CallRecord");
const AdvancedQueryBuilder = require("../utils/queryBuilder");
const redis = require("../config/redis");
const logger = require("../utils/logger");

class AdvancedStatsService {
  constructor() {
    this.dispositionTypes = [
      "Sales",
      "Not Interested",
      "Not Qualified",
      "DNC",
      "Voicemail",
      "Tech Issues",
      "DWSPI",
      "Unresponsive",
      "Hungup",
      "Callback",
      "IVR",
      "Subsidy",
      "Language Barrier",
      "Misdialed",
    ];
  }

  /**
   * Main entry point: Get stats with caching
   */
  async getStats(filters = {}) {
    // sanitize filters
    filters = Object.fromEntries(
      Object.entries(filters).filter(
        ([, v]) => v !== null && v !== "null" && v !== ""
      )
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
        .setBuyerFilter(filters.buyer);

      const [totalCounts, dispositionStats, hourlyStats] = await Promise.all([
        this._getTotalCounts(queryBuilder),
        this._getDispositionStats(queryBuilder),
        this._getHourlyStats(queryBuilder),
      ]);

      // attach group-level flags
      const flaggedByBuyer = totalCounts.byBuyer.map((g) =>
        this._generateFlagsForGroup(g)
      );
      const flaggedByCampaign = totalCounts.byCampaign.map((g) =>
        this._generateFlagsForGroup(g)
      );
      const flaggedByTarget = totalCounts.byTarget.map((g) =>
        this._generateFlagsForGroup(g)
      );
      const flaggedByPublisher = totalCounts.byPublisher.map((g) =>
        this._generateFlagsForGroup(g)
      );

      const result = {
        ...totalCounts,
        dispositions: dispositionStats,
        hourly: hourlyStats,
        flags: this._generateFlags(totalCounts, dispositionStats),
        byBuyer: flaggedByBuyer,
        byCampaign: flaggedByCampaign,
        byTarget: flaggedByTarget,
        byPublisher: flaggedByPublisher,
        summary: this._generateSummary(totalCounts, dispositionStats),
        generatedAt: new Date().toISOString(),
      };

      await redis.setex(cacheKey, 120, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error("Stats calculation failed:", error);
      throw new Error(`Failed to calculate statistics: ${error.message}`);
    }
  }

  /**
   * Totals and group breakdowns
   */
  async _getTotalCounts(queryBuilder) {
    const baseQuery = queryBuilder.disableCache();
    const matchStage = baseQuery._buildFinalQuery();

    const [
      totalCalls,
      completedCalls,
      totalDuration,
      avgDuration,
      byBuyer,
      byCampaign,
      byTarget,
      byPublisher,
    ] = await Promise.all([
      CallRecord.countDocuments(matchStage),
      CallRecord.countDocuments({ ...matchStage, status: "completed" }),
      this._getTotalDuration(matchStage),
      this._getAverageDuration(matchStage),
      this._getDispositionStatsByGroup(queryBuilder, "buyer"),
      this._getDispositionStatsByGroup(queryBuilder, "campaign"),
      this._getDispositionStatsByGroup(queryBuilder, "target"),
      this._getDispositionStatsByGroup(queryBuilder, "publisher"),
    ]);

    return {
      totalCalls,
      completedCalls,
      failedCalls: totalCalls - completedCalls,
      totalDuration: Math.round(totalDuration),
      avgDuration: Math.round(avgDuration),
      completionRate: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0,
      byBuyer,
      byCampaign,
      byTarget,
      byPublisher,
    };
  }

  /**
   * Disposition stats (global)
   */
  async _getDispositionStats(queryBuilder) {
    const matchStage = queryBuilder._buildFinalQuery();

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$qc.disposition",
          count: { $sum: 1 },
          totalDuration: { $sum: "$durationSec" },
          avgDuration: { $avg: "$durationSec" },
        },
      },
      {
        $project: {
          _id: 0,
          disposition: "$_id",
          count: 1,
          totalDuration: 1,
          avgDuration: { $round: ["$avgDuration", 2] },
        },
      },
      { $sort: { count: -1 } },
    ];

    const results = await CallRecord.aggregate(pipeline, {
      maxTimeMS: 30000,
      allowDiskUse: true,
    });

    const total = results.reduce((sum, item) => sum + item.count, 0);

    const resultsWithPercentage = results.map((item) => ({
      ...item,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : "0.00",
    }));

    return this.dispositionTypes.map((disposition) => {
      const stat =
        resultsWithPercentage.find((r) => r.disposition === disposition) || {};
      return {
        disposition,
        count: stat.count || 0,
        totalDuration: stat.totalDuration || 0,
        avgDuration: stat.avgDuration || 0,
        percentage: stat.percentage || "0.00",
      };
    });
  }

  /**
   * Flagging logic (global-level)
   */
  _generateFlags(totalCounts, dispositions) {
    const total = totalCounts.totalCalls || 0;

    const getCount = (name) =>
      dispositions.find((d) => d.disposition === name)?.count || 0;

    const rejectedUnknown =
      getCount("Failed") + getCount("Unknown") + getCount("Tech Issues");
    const redNoConnect =
      getCount("Failed") +
      getCount("Hungup") +
      getCount("Unresponsive") +
      getCount("IVR");
    const hungup = getCount("Hungup");
    const voicemail = getCount("Voicemail");

    return {
      flagRejectedUnknown: total > 0 && (rejectedUnknown / total) * 100 >= 50,
      rejectedUnknownPct:
        total > 0 ? ((rejectedUnknown / total) * 100).toFixed(2) : "0.00",
      redNoConnectPct:
        total > 0 ? ((redNoConnect / total) * 100).toFixed(2) : "0.00",
      flagTargetHU: total > 0 && (hungup / total) * 100 >= 20,
      hungupPct: total > 0 ? ((hungup / total) * 100).toFixed(2) : "0.00",
      flagVoicemail: voicemail > 0,
    };
  }

  /**
   * Flagging logic (group-level: Buyer / Campaign / Target / Publisher)
   */
  _generateFlagsForGroup(group) {
    const total = group.total || 0;

    const getCount = (name) =>
      group.dispositions.find((d) => d.disposition === name)?.count || 0;

    const rejectedUnknown =
      getCount("Failed") + getCount("Unknown") + getCount("Tech Issues");
    const redNoConnect =
      getCount("Failed") +
      getCount("Hungup") +
      getCount("Unresponsive") +
      getCount("IVR");
    const hungup = getCount("Hungup");
    const voicemail = getCount("Voicemail");

    return {
      ...group,
      flags: {
        flagRejectedUnknown: total > 0 && (rejectedUnknown / total) * 100 >= 50,
        rejectedUnknownPct:
          total > 0 ? ((rejectedUnknown / total) * 100).toFixed(2) : "0.00",
        redNoConnectPct:
          total > 0 ? ((redNoConnect / total) * 100).toFixed(2) : "0.00",
        flagTargetHU: total > 0 && (hungup / total) * 100 >= 20,
        hungupPct: total > 0 ? ((hungup / total) * 100).toFixed(2) : "0.00",
        flagVoicemail: voicemail > 0,
      },
    };
  }

  /**
   * Group breakdown stats (raw)
   */
  async _getDispositionStatsByGroup(queryBuilder, groupBy = "campaign") {
    const matchStage = queryBuilder._buildFinalQuery();

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            group: `$${groupBy}`,
            disposition: "$qc.disposition",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.group",
          dispositions: {
            $push: {
              disposition: "$_id.disposition",
              count: "$count",
            },
          },
          total: { $sum: "$count" },
        },
      },
      {
        $project: {
          _id: 0,
          [groupBy]: "$_id",
          dispositions: 1,
          total: 1,
        },
      },
    ];

    return CallRecord.aggregate(pipeline, { allowDiskUse: true });
  }

  /**
   * Hourly breakdown stats
   */
  async _getHourlyStats(queryBuilder) {
    const matchStage = queryBuilder._buildFinalQuery();

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: "$callTimestamp" },
          count: { $sum: 1 },
          totalDuration: { $sum: "$durationSec" },
        },
      },
      {
        $project: {
          _id: 0,
          hour: "$_id",
          count: 1,
          avgDuration: {
            $round: [{ $divide: ["$totalDuration", "$count"] }, 2],
          },
        },
      },
      { $sort: { hour: 1 } },
    ];

    return CallRecord.aggregate(pipeline, {
      maxTimeMS: 15000,
      allowDiskUse: true,
    });
  }

  async _getTotalDuration(matchStage) {
    const result = await CallRecord.aggregate(
      [
        { $match: matchStage },
        { $group: { _id: null, total: { $sum: "$durationSec" } } },
      ],
      { maxTimeMS: 15000, allowDiskUse: true }
    );
    return result[0]?.total || 0;
  }

  async _getAverageDuration(matchStage) {
    const result = await CallRecord.aggregate(
      [
        { $match: matchStage },
        { $group: { _id: null, average: { $avg: "$durationSec" } } },
      ],
      { maxTimeMS: 15000, allowDiskUse: true }
    );
    return result[0]?.average || 0;
  }

  /**
   * Summary metrics
   */
  _generateSummary(totalCounts, dispositionStats) {
    const sales =
      dispositionStats.find((d) => d.disposition === "Sales") || { count: 0 };
    const notInterested =
      dispositionStats.find((d) => d.disposition === "Not Interested") || {
        count: 0,
      };

    return {
      conversionRate:
        totalCounts.completedCalls > 0
          ? (sales.count / totalCounts.completedCalls) * 100
          : 0,
      rejectionRate:
        totalCounts.completedCalls > 0
          ? (notInterested.count / totalCounts.completedCalls) * 100
          : 0,
      efficiencyScore: this._calculateEfficiencyScore(
        totalCounts,
        dispositionStats
      ),
    };
  }

  _calculateEfficiencyScore(totalCounts, dispositionStats) {
    const sales =
      dispositionStats.find((d) => d.disposition === "Sales")?.count || 0;

    const positiveDispositions = ["Sales", "Callback"].reduce((sum, disp) => {
      return (
        sum + (dispositionStats.find((d) => d.disposition === disp)?.count || 0)
      );
    }, 0);

    const negativeDispositions = ["Not Interested", "DNC", "Not Qualified"].reduce(
      (sum, disp) =>
        sum + (dispositionStats.find((d) => d.disposition === disp)?.count || 0),
      0
    );

    if (totalCounts.completedCalls === 0) return 0;

    const positiveRatio = positiveDispositions / totalCounts.completedCalls;
    const negativeRatio = negativeDispositions / totalCounts.completedCalls;

    return Math.max(
      0,
      Math.min(100, positiveRatio * 80 - negativeRatio * 20 + sales * 0.5)
    );
  }

  /**
   * Real-time stats for dashboards
   */
  async getRealTimeStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [currentStats, trend] = await Promise.all([
      this.getStats({
        startDate: oneHourAgo.toISOString(),
        endDate: now.toISOString(),
      }),
      this._getTrendStats(oneHourAgo, now),
    ]);

    return {
      ...currentStats,
      trend,
      lastUpdated: now.toISOString(),
    };
  }

  async _getTrendStats(start, end) {
    const previousStart = new Date(
      start.getTime() - (end.getTime() - start.getTime())
    );
    const previousEnd = new Date(
      end.getTime() - (end.getTime() - start.getTime())
    );

    const [current, previous] = await Promise.all([
      this.getStats({ startDate: start.toISOString(), endDate: end.toISOString() }),
      this.getStats({
        startDate: previousStart.toISOString(),
        endDate: previousEnd.toISOString(),
      }),
    ]);

    return {
      callsChange: this._calculateChange(
        current.totalCalls || 0,
        previous.totalCalls || 0
      ),
      conversionChange: this._calculateChange(
        current.summary?.conversionRate || 0,
        previous.summary?.conversionRate || 0
      ),
      efficiencyChange: this._calculateChange(
        current.summary?.efficiencyScore || 0,
        previous.summary?.efficiencyScore || 0
      ),
    };
  }

  _calculateChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}

module.exports = new AdvancedStatsService();
