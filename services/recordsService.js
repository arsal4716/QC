const CallRecord = require("../models/CallRecord");
const QueryBuilder = require("../utils/queryBuilder");
const redis = require("../config/redis");
const logger = require("../utils/logger");

class RecordsService {
  constructor() {
    this.defaultProjection = {
      _id: 1,
      callTimestamp: 1,
      campaignName: 1,
      systemBuyerId: 1,
      "ringbaRaw.target_name": 1,   
      publisherName: 1,
      callerId: 1,
      recordingUrl: 1,
      systemCallId: 1,
      systemPublisherId: 1,
      "qc.disposition": 1,
      "qc.sub_disposition": 1,
      "qc.reason": 1,
      "qc.summary": 1,
      "qc.sentiment": 1,
      disposition: 1,
      sub_disposition: 1,
      reason: 1,
      summary: 1,
      sentiment: 1,
      transcript: 1,
      status: 1,
      durationSec: 1,
      "qc.income": 1,
    };

    this.detailProjection = {
      ...this.defaultProjection,
      transcript: 1,
      labeledTranscript: 1,
      ringbaRaw: 1,
      "qc.confidence_level": 1,
      "qc.key_moments": 1,
      "qc.objections_raised": 1,
      "qc.objections_overcome": 1,
      "qc.income": 1,
    };
  }

  async getRecords(filters = {}, options = {}) {
    try {
      const queryBuilder = QueryBuilder.forModel(CallRecord)
        .setDateRange(filters)
        .setCampaignFilter(filters.campaign)
        .setPublisherFilter(filters.publisher)
        .setTargetFilter(filters.target)
        .setBuyerFilter(filters.buyer)
        .setDispositionFilter(filters.disposition, "qc.disposition")
        .setStatusFilter(filters.status)
        .setSearchFilter(filters.search)
        .setPagination(options.page, options.limit)
        .setSort(options.sortBy, options.sortDir)
        .setProjection(this.defaultProjection)
        .enableCache(60);

      const [data, total] = await Promise.all([
        queryBuilder.execute(),
        queryBuilder.count(),
      ]);

      const transformedData = this._transformRecords(data);

      return {
        data: transformedData,
        meta: {
          page: options.page || 1,
          limit: options.limit || 25,
          total,
          pages: Math.max(1, Math.ceil(total / (options.limit || 25))),
          hasMore:
            (options.page || 1) < Math.ceil(total / (options.limit || 25)),
        },
      };
    } catch (error) {
      logger.error("Failed to fetch records:", error);
      throw new Error(`Records query failed: ${error.message}`);
    }
  }

  async getRecordById(id) {
    const cacheKey = `record:${id}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const record = await CallRecord.findById(id)
        .select(this.detailProjection)
        .lean()
        .maxTimeMS(5000);

      if (!record) {
        throw new Error("Record not found");
      }

      const transformed = this._transformRecord(record);
      await redis.setex(cacheKey, 300, JSON.stringify(transformed));

      return transformed;
    } catch (error) {
      logger.error(`Failed to fetch record ${id}:`, error);
      throw new Error(`Record fetch failed: ${error.message}`);
    }
  }

async exportRecords(filters = {}) {
  try {
    const queryBuilder = QueryBuilder.forModel(CallRecord)
      .setDateRange(filters)
      .setCampaignFilter(filters.campaign)
      .setTargetFilter(filters.target)
      .setPublisherFilter(filters.publisher)
      .setBuyerFilter(filters.buyer)
      .setDispositionFilter(filters.disposition, "qc.disposition")
      .setStatusFilter(filters.status)
      .setSearchFilter(filters.search)
      .setSort(filters.sortBy || "callTimestamp", filters.sortDir || "desc")
      .disableCache(); 

    const cursor = await CallRecord.find(queryBuilder._buildFinalQuery())
      .select(this.defaultProjection)
      .sort(queryBuilder.options.sort || { callTimestamp: -1 })
      .lean()
      .cursor({ batchSize: 1000 });

    const records = [];
    for await (const doc of cursor) {
      records.push(this._transformRecord(doc));
      if (records.length % 5000 === 0) {
        logger.info(`Export progress: ${records.length} records processed`);
      }
    }

    return records;
  } catch (error) {
    logger.error("Export records failed:", error);
    throw new Error(`Export failed: ${error.message}`);
  }
}

  async getFieldValues(field, filters = {}) {
    const validFields = [
      "campaignName",
      "publisherName",
      "systemName",
      "systemBuyerId",
      "ringbaRaw.target_name",
      "qc.disposition",
      "status",
      "callStatus",
    ];

    if (!validFields.includes(field)) {
      throw new Error(`Invalid field for dynamic filtering: ${field}`);
    }

    const cacheKey = this._generateCacheKey("dynamic", field, filters);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const queryBuilder = AdvancedQueryBuilder.forModel(CallRecord)
        .setDateRange(filters)
        .setCampaignFilter(filters.campaign)
        .setTargetFilter(filters.target)
        .setPublisherFilter(filters.publisher)
        .setBuyerFilter(filters.buyer)
        .setDispositionFilter(filters.disposition, "qc.disposition")
        .setStatusFilter(filters.status);

      const matchStage = queryBuilder._buildFinalQuery();

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: `$${field}`,
            count: { $sum: 1 },
            totalDuration: { $sum: "$durationSec" },
          },
        },
        { $match: { _id: { $ne: null, $exists: true } } },
        { $sort: { count: -1 } },
        { $limit: 1000 },
        {
          $project: {
            _id: 0,
            value: "$_id",
            label: "$_id",
            count: 1,
            avgDuration: {
              $round: [{ $divide: ["$totalDuration", "$count"] }, 2],
            },
          },
        },
      ];
      if (field.includes(".")) {
        pipeline.unshift({
          $match: { [field]: { $exists: true, $ne: null } },
        });
      }
      const results = await CallRecord.aggregate(pipeline, {
        maxTimeMS: 15000,
        allowDiskUse: true,
      });
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(results));

      return results;
    } catch (error) {
      logger.error("Dynamic filter query failed", {
        error: error.message,
        field,
        filters,
      });
      throw new Error(`Failed to load dynamic filter values: ${error.message}`);
    }
  }
  async getCallTimeline(filters = {}, interval = "hour") {
    const queryBuilder = QueryBuilder.forModel(CallRecord)
      .setDateRange(filters)
      .setCampaignFilter(filters.campaign)
      .setTargetFilter(filters.target)
      .setPublisherFilter(filters.publisher)
      .setBuyerFilter(filters.buyer)
      .setDispositionFilter(filters.disposition, "qc.disposition")
      .setStatusFilter(filters.status);

    const groupStage = {
      _id: {
        [interval]:
          interval === "hour"
            ? { $hour: "$callTimestamp" }
            : { $dayOfMonth: "$callTimestamp" },
      },
      count: { $sum: 1 },
      totalDuration: { $sum: "$durationSec" },
    };

    const pipeline = [
      { $match: queryBuilder._buildFinalQuery() },
      { $group: groupStage },
      { $sort: { "_id.hour": 1 } },
    ];

    const results = await queryBuilder.aggregate(pipeline);

    return results.map((item) => ({
      time: item._id.hour || item._id.day,
      count: item.count,
      avgDuration: Math.round(item.totalDuration / item.count),
    }));
  }
  _transformRecords(records) {
    return records.map((record) => this._transformRecord(record));
  }

  _transformRecord(record) {
    const disposition =
      record.qc?.disposition || record.disposition || "Not Classified";
    const sub_disposition =
      record.qc?.sub_disposition || record.sub_disposition || null;
    const reason = record.qc?.reason || record.reason || "";
    const summary = record.qc?.summary || record.summary || "";
    const sentiment = record.qc?.sentiment || record.sentiment || "";

    return {
      ...record,
    target_name: record.target_name || record.ringbaRaw?.target_name || null, 
      durationSec:
        record.ringbaRaw?.duration_seconds || record.durationSec || 0,
      callerNumber: record.ringbaRaw?.caller_number || record.callerId,
      disposition,
      sub_disposition,
      reason,
      summary,
      sentiment,
      income: record.qc?.income?.value || record.qc?.income || null,
    };
  }

  async _clearCacheForRecords(ids) {
    const keys = ids.map((id) => `record:${id}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.keys("query:CallRecord:*").then((keys) => {
      if (keys.length > 0) {
        return redis.del(...keys);
      }
    });
  }
}

module.exports = new RecordsService();
