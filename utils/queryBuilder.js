const { DateTime } = require("luxon");
const redis = require("../config/redis");
const logger = require("../utils/logger");
const crypto = require("crypto");

class QueryBuilder {
  constructor(model) {
    this.model = model;
    this.query = {};
    this.options = {};
    this.cacheEnabled = true;
    this.cacheTTL = 300;
  }

  static forModel(model) {
    return new QueryBuilder(model);
  }

  setDateRange({
    preset,
    startDate,
    endDate,
    timezone = "America/New_York",
  } = {}) {
    if (!preset && !startDate && !endDate) {
      preset = "today";
    }

    const { start, end } = this._buildDateRange(
      preset,
      startDate,
      endDate,
      timezone
    );
    if (start)
      this.query.callTimestamp = { ...this.query.callTimestamp, $gte: start };
    if (end)
      this.query.callTimestamp = { ...this.query.callTimestamp, $lte: end };

    return this;
  }

  setCampaignFilter(campaigns) {
    if (!campaigns) return this;
    const list = this._normalizeArray(campaigns);
    if (list.length) {
      this.query.$and = this.query.$and || [];
      this.query.$and.push({
        $or: [{ campaignName: { $in: list } }, { campaignSlug: { $in: list } }],
      });
    }
    return this;
  }

  setPublisherFilter(publishers) {
    if (!publishers) return this;
    const list = this._normalizeArray(publishers);
    if (list.length) {
      this.query.$and = this.query.$and || [];
      this.query.$and.push({
        $or: [
          { publisherName: { $in: list } },
          { publisherSlug: { $in: list } },
        ],
      });
    }
    return this;
  }

  setTargetFilter(targets) {
    if (!targets) return this;
    const list = this._normalizeArray(targets);
    if (list.length) {
      this.query.$and = this.query.$and || [];
      this.query.$and.push({
        $or: [{ target_name: { $in: list } }, { targetSlug: { $in: list } }],
      });
    }
    return this;
  }

  setBuyerFilter(buyers) {
    if (!buyers) return this;
    const list = this._normalizeArray(buyers);
    if (list.length) {
      this.query.$and = this.query.$and || [];
      this.query.$and.push({
        $or: [
          { systemBuyerId: { $in: list } },
          { systemBuyerSlug: { $in: list } },
        ],
      });
    }
    return this;
  }

  setDispositionFilter(dispositions, field = "qc.disposition") {
    if (!dispositions) return this;
    const list = this._normalizeArray(dispositions).map((d) => d.toLowerCase());
    if (list.length)
      this.query[field] = list.length === 1 ? list[0] : { $in: list };
    return this;
  }

  setSubDispositionFilter(subDispositions, field = "qc.sub_disposition") {
    if (!subDispositions) return this;
    const list = this._normalizeArray(subDispositions).map((d) =>
      d.toLowerCase()
    );
    if (list.length)
      this.query[field] = list.length === 1 ? list[0] : { $in: list };
    return this;
  }

  setStatusFilter(status, field = "status") {
    return this._setInQuery(field, status);
  }

  setCallStatusFilter(status, field = "callStatus") {
    return this._setInQuery(field, status);
  }

  setSearchFilter(term, fields = null) {
    if (!term || !term.trim()) return this;
    const trimmed = term.trim();
    if (trimmed.length > 2 && !trimmed.includes(":")) {
      this.query.$text = { $search: trimmed };
      this.options.score = { $meta: "textScore" };
    } else {
      const searchFields = fields || [
        { callerId: new RegExp(trimmed, "i") },
        { campaignName: new RegExp(trimmed, "i") },
        { publisherName: new RegExp(trimmed, "i") },
        { "qc.reason": new RegExp(trimmed, "i") },
        { "qc.summary": new RegExp(trimmed, "i") },
      ];
      if (!this.query.$or) this.query.$or = [];
      this.query.$or.push(...searchFields);
    }
    return this;
  }
  setPagination(page = 1, limit = 25) {
    const safePage = Math.max(1, parseInt(page));
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));
    this.options.page = safePage;
    this.options.limit = safeLimit;
    this.options.skip = (safePage - 1) * safeLimit;
    return this;
  }

  setSort(sortBy = "callTimestamp", sortDir = "desc") {
    const field = this._mapSortField(sortBy);
    this.options.sort = { [field]: sortDir === "asc" ? 1 : -1 };
    if (field !== "callTimestamp") this.options.sort.callTimestamp = -1;
    return this;
  }

  setProjection(fields) {
    this.options.projection = fields;
    return this;
  }

  enableCache(ttl = 300) {
    this.cacheEnabled = true;
    this.cacheTTL = ttl;
    return this;
  }

  disableCache() {
    this.cacheEnabled = false;
    return this;
  }
  async execute() {
    const cacheKey = this._generateCacheKey();
    if (this.cacheEnabled) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return JSON.parse(cached);
      }
    }

    const finalQuery = this._buildFinalQuery();
    const result = await Promise.race([
      this._executeQuery(finalQuery),
      this._timeout(15000),
    ]);
    if (this.cacheEnabled && result) {
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(result));
    }
    return result;
  }

  async count() {
    return this.model.countDocuments(this._buildFinalQuery());
  }

  async aggregate(pipeline = []) {
    const matchStage = { $match: this._buildFinalQuery() };
    return this.model
      .aggregate([matchStage, ...pipeline])
      .maxTimeMS(30000)
      .allowDiskUse(true);
  }

  _setInQuery(field, value) {
    if (!value) return this;
    const arr = this._normalizeArray(value);
    if (!arr.length) return this;
    this.query[field] = arr.length === 1 ? arr[0] : { $in: arr };
    return this;
  }

  _normalizeArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((v) => v && v !== "all");
    if (typeof value === "string")
      return value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v && v !== "all");
    return [];
  }

  _mapSortField(field) {
    const map = {
      timestamp: "callTimestamp",
      campaign: "campaignName",
      publisher: "systemName",
      disposition: "qc.disposition",
      status: "status",
      duration: "durationSec",
    };
    return map[field] || field;
  }

  _buildDateRange(preset, startDate, endDate, timezone = "America/New_York") {
    const now = DateTime.now().setZone(timezone);
    let start, end;
    const ranges = {
      today: () => ({ start: now.startOf("day"), end: now.endOf("day") }),
      yesterday: () => ({
        start: now.minus({ days: 1 }).startOf("day"),
        end: now.minus({ days: 1 }).endOf("day"),
      }),
      last_7_days: () => ({
        start: now.minus({ days: 7 }).startOf("day"),
        end: now.endOf("day"),
      }),
      this_week: () => ({ start: now.startOf("week"), end: now.endOf("week") }),
      last_week: () => ({
        start: now.minus({ weeks: 1 }).startOf("week"),
        end: now.minus({ weeks: 1 }).endOf("week"),
      }),
      last_30_days: () => ({
        start: now.minus({ days: 30 }).startOf("day"),
        end: now.endOf("day"),
      }),
      this_month: () => ({
        start: now.startOf("month"),
        end: now.endOf("month"),
      }),
      last_month: () => ({
        start: now.minus({ months: 1 }).startOf("month"),
        end: now.minus({ months: 1 }).endOf("month"),
      }),
      last_6_months: () => ({
        start: now.minus({ months: 6 }).startOf("day"),
        end: now.endOf("day"),
      }),
      this_year: () => ({ start: now.startOf("year"), end: now.endOf("year") }),
    };

    if (preset && ranges[preset]) {
      ({ start, end } = ranges[preset]());
    } else {
      start = startDate
        ? DateTime.fromISO(startDate, { zone: timezone })
        : null;
      end = endDate ? DateTime.fromISO(endDate, { zone: timezone }) : null;
    }

    return {
      start: start ? start.toUTC().toJSDate() : null,
      end: end ? end.toUTC().toJSDate() : null,
    };
  }

  _buildFinalQuery() {
    const q = { ...this.query };
    if (q.callTimestamp) {
      const ts = {};
      if (q.callTimestamp.$gte) ts.$gte = q.callTimestamp.$gte;
      if (q.callTimestamp.$lte) ts.$lte = q.callTimestamp.$lte;
      if (Object.keys(ts).length) q.callTimestamp = ts;
    }
    return q;
  }

  _generateCacheKey() {
    const hash = crypto
      .createHash("md5")
      .update(
        JSON.stringify({
          q: this.query,
          o: this.options,
          ts: Math.floor(Date.now() / (this.cacheTTL * 1000)),
        })
      )
      .digest("hex");
    return `query:${this.model.modelName}:${hash}`;
  }

  async _executeQuery(finalQuery) {
    const query = this.model.find(finalQuery);
    if (this.options.projection) query.select(this.options.projection);
    if (this.options.sort) query.sort(this.options.sort);
    if (this.options.skip !== undefined) query.skip(this.options.skip);
    if (this.options.limit !== undefined) query.limit(this.options.limit);
    query.lean().maxTimeMS(10000);
    return query.exec();
  }

  _timeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
    );
  }
}

module.exports = QueryBuilder;
