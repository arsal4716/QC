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

 setCampaignFilter(campaigns) {
    if (!campaigns) return this;
    const list = this._normalizeArray(campaigns);
    if (list.length) {
        this.query.$and = this.query.$and || [];
        this.query.$and.push({
            $or: [
                { campaignSlug: { $in: list } },  
                { campaignName: { $in: list } }   
            ],
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

  setSystemFilter(system) {
    if (!system) return this;
    const list = this._normalizeArray(system);
    if (!list.length) return this;
    // Build exact-match casing variants so the systemName index is used
    // (case-insensitive regex would force a collection scan).
    const variants = new Set();
    list.forEach((s) => {
      const v = String(s).trim();
      if (!v) return;
      variants.add(v);
      variants.add(v.toLowerCase());
      variants.add(v.toUpperCase());
      variants.add(v.charAt(0).toUpperCase() + v.slice(1).toLowerCase());
    });
    const values = Array.from(variants);
    this.query.systemName = values.length === 1 ? values[0] : { $in: values };
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
  const list = this._normalizeArray(dispositions); 
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

    // Phone-number aware search. Supports US formats like:
    //   1234567890, (123) 456-7890, +1 123 456 7890, 123-456-7890
    const digits = trimmed.replace(/\D/g, "");
    const isPhoneLike =
      digits.length >= 7 && /^[\d\s().+-]+$/.test(trimmed);

    if (isPhoneLike) {
      // Drop a leading US country code so "+1 123..." matches stored "123...".
      let core = digits;
      if (core.length === 11 && core.startsWith("1")) core = core.slice(1);
      // Match the digit sequence even when the stored value contains
      // separators e.g. "(123) 456-7890".
      const pattern = core.split("").join("\\D*");
      const rx = new RegExp(pattern);
      this.query.$and = this.query.$and || [];
      this.query.$and.push({
        $or: [
          { callerId: rx },
          { inboundPhoneNumber: rx },
          { dialedNumber: rx },
        ],
      });
      return this;
    }

    if (trimmed.length > 2 && !trimmed.includes(":")) {
      this.query.$text = { $search: trimmed };
      this.options.score = { $meta: "textScore" };
    } else {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchFields = fields || [
        { callerId: new RegExp(escaped, "i") },
        { campaignName: new RegExp(escaped, "i") },
        { publisherName: new RegExp(escaped, "i") },
        { "qc.reason": new RegExp(escaped, "i") },
        { "qc.summary": new RegExp(escaped, "i") },
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
    const finalQuery = this._buildFinalQuery();

    // Cache counts (keyed on the query only, not pagination/sort). Counting a
    // large filtered range is expensive and would otherwise run on every page
    // change and re-filter.
    let cacheKey = null;
    if (this.cacheEnabled) {
      const hash = crypto
        .createHash("md5")
        .update(
          JSON.stringify({
            q: finalQuery,
            ts: Math.floor(Date.now() / (this.cacheTTL * 1000)),
          })
        )
        .digest("hex");
      cacheKey = `count:${this.model.modelName}:${hash}`;
      const cached = await redis.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        const n = parseInt(cached, 10);
        if (!Number.isNaN(n)) return n;
      }
    }

    const total = await this.model
      .countDocuments(finalQuery)
      .maxTimeMS(15000);

    if (cacheKey) {
      await redis.setex(cacheKey, this.cacheTTL, String(total));
    }
    return total;
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

_buildDateRange(datePreset, startDate, endDate, timezone = "America/New_York") {
  const now = DateTime.now().setZone(timezone);
  let start, end;

  const ranges = {
    today: () => ({
      start: now.startOf("day"),
      end: now.endOf("day"),
    }),
    yesterday: () => ({
      start: now.minus({ days: 1 }).startOf("day"),
      end: now.minus({ days: 1 }).endOf("day"),
    }),
    last_2_days: () => ({
      start: now.minus({ days: 2 }).startOf("day"),
      end: now.endOf("day"),
    }),
    last_7_days: () => ({
      start: now.minus({ days: 7 }).startOf("day"), 
      end: now.endOf("day"),
    }),
    this_week: () => ({
      start: now.startOf("week"),
      end: now.endOf("week"),
    }),
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
    this_year: () => ({
      start: now.startOf("year"),
      end: now.endOf("year"),
    }),
  };

  if (datePreset && ranges[datePreset]) {
    ({ start, end } = ranges[datePreset]());
  } else if (datePreset === "custom" || (!datePreset && (startDate || endDate))) {
    start = startDate
      ? DateTime.fromISO(startDate, { zone: timezone }).startOf("day")
      : null;
    end = endDate
      ? DateTime.fromISO(endDate, { zone: timezone }).endOf("day")
      : null;
  } else {
    ({ start, end } = ranges.today());
  }

  return {
    start: start ? start.toUTC().toJSDate() : null,
    end: end ? end.toUTC().toJSDate() : null,
  };
}

setDateRange({
  datePreset,
  startDate,
  endDate,
  timezone = "America/New_York",
} = {}) {
  const { start, end } = this._buildDateRange(
    datePreset,
    startDate,
    endDate,
    timezone
  );
  this.query.callTimestamp = {};
  
  if (start) this.query.callTimestamp.$gte = start;
  if (end) this.query.callTimestamp.$lte = end;

  return this;
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
