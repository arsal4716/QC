const AdvancedStatsService = require("../services/statsService");
const AdvancedRecordsService = require("../services/recordsService");
const QueryBuilder = require("../utils/queryBuilder");
const CallRecord = require("../models/CallRecord");
const { success, error } = require("../utils/apiResponse");
const logger = require("../utils/logger");
const ExcelJS = require("exceljs");
const axios = require("axios");
const { Transform, pipeline, Readable } = require("stream");
const { promisify } = require("util");
const { DateTime } = require("luxon");
const streamPipeline = promisify(pipeline);
const os = require("os");

const EST_ZONE = "America/New_York";

// Format any timestamp value to a consistent EST string for exports/UI.
const formatEST = (value) => {
  if (!value) return "";
  const dt =
    value instanceof Date
      ? DateTime.fromJSDate(value, { zone: "utc" })
      : DateTime.fromISO(String(value), { zone: "utc" });
  if (!dt.isValid) return "";
  return dt.setZone(EST_ZONE).toFormat("yyyy-MM-dd hh:mm:ss a 'EST'");
};

class StreamExportManager {
  constructor() {
    this.maxConcurrency = Math.max(1, os.cpus().length - 1);
    this.batchSize = 10000;
  }

  async createCSVStream(cursor, transformFn) {
    return new Promise((resolve, reject) => {
      const stream = new Transform({
        objectMode: true,
        highWaterMark: this.batchSize,
        transform(chunk, encoding, callback) {
          try {
            const transformed = transformFn(chunk);
            callback(null, transformed);
          } catch (err) {
            callback(err);
          }
        }
      });

      resolve(stream);
    });
  }
}

class CallController {
  constructor() {
    this.statsService = AdvancedStatsService;
    this.recordsService = AdvancedRecordsService;
    this.exportManager = new StreamExportManager();
    this.exportColumns = this._getExportColumns();
    Object.getOwnPropertyNames(CallController.prototype)
      .filter(method => method !== 'constructor')
      .forEach(method => {
        this[method] = this[method].bind(this);
      });
  }

  _getExportColumns() {
    return [
      { header: "Time Stamp", key: "callTimestamp", width: 20 },
      { header: "Publisher", key: "publisherName", width: 15 },
      { header: "Caller ID", key: "callerId", width: 15 },
      { header: "Disposition", key: "disposition", width: 15 },
      { header: "Sub Disposition", key: "sub_disposition", width: 15 },
      { header: "Duration (sec)", key: "durationSec", width: 12 },
      { header: "Campaign Name", key: "campaignName", width: 20 },
      { header: "Transcript", key: "transcript", width: 20 },
      { header: "Reason", key: "reason", width: 20 },
      { header: "Summary", key: "summary", width: 30 },
      { header: "Target", key: "target_name", width: 15 },
      { header: "Buyer ID", key: "systemBuyerId", width: 15 },
      { header: "Recording Link", key: "recordingUrl", width: 30 },
      { header: "System Call ID", key: "systemCallId", width: 20 },
      { header: "income", key: "income", width: 20 },
    ];
  }

  async exportRecords(req, res) {
    let cursor = null;
    let exportStartTime = Date.now();

    try {
      const filters = { ...req.query };
      const format = (filters.fmt || 'csv').toLowerCase();

      logger.info("Starting bulk export", {
        format,
        filters: Object.keys(filters).filter(k => filters[k]),
        timestamp: new Date().toISOString()
      });
      if (!['csv', 'xlsx'].includes(format)) {
        return error(res, {
          status: 400,
          message: "Invalid format. Supported formats: csv, xlsx",
          code: "INVALID_EXPORT_FORMAT"
        });
      }

      // Resolve which columns to export. The UI sends a comma-separated list of
      // column keys from the Column Settings panel; export ONLY those, in order.
      const exportColumns = this._resolveExportColumns(filters.columns);

      const queryBuilder = QueryBuilder.forModel(CallRecord)
        .setDateRange(filters)
        .setSystemFilter(filters.system)
        .setCampaignFilter(filters.campaign)
        .setTargetFilter(filters.target)
        .setPublisherFilter(filters.publisher)
        .setBuyerFilter(filters.buyer)
        .setDispositionFilter(filters.disposition, "qc.disposition")
        .setStatusFilter(filters.status)
        .setSearchFilter(filters.search)
        .setSort(filters.sortBy || "callTimestamp", filters.sortDir || "desc")
        .disableCache();

      const finalQuery = queryBuilder._buildFinalQuery();

      // Note: we intentionally do NOT pre-count here. Counting a large filtered
      // range can take several seconds and only delayed the download; streaming
      // starts immediately instead.

      res.setHeader('Content-Type',
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv; charset=utf-8'
      );
      res.setHeader('Content-Disposition',
        `attachment; filename="call_records_${Date.now()}.${format}"`
      );
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Only fetch the (large) transcript field when it is actually exported.
      // Dropping it otherwise dramatically speeds up large exports.
      const exportProjection = { ...this.recordsService.defaultProjection };
      const wantsTranscript = exportColumns.some((c) => c.key === "transcript");
      if (!wantsTranscript) delete exportProjection.transcript;

      // Create cursor with optimized settings for large datasets
      cursor = await CallRecord.find(finalQuery)
        .select(exportProjection)
        .sort(queryBuilder.options.sort || { callTimestamp: -1 })
        .lean()
        .batchSize(5000)
        .maxTimeMS(300000)
        .cursor();

      let processedCount = 0;
      let lastProgressLog = Date.now();

      if (format === 'csv') {
        await this._streamCSVExport(res, cursor, processedCount, lastProgressLog, exportColumns);
      } else {
        await this._streamExcelExport(res, cursor, processedCount, lastProgressLog, exportColumns);
      }

      const exportDuration = Date.now() - exportStartTime;
      logger.metric("export_completed", {
        duration: exportDuration,
        recordCount: processedCount,
        format,
        recordsPerSecond: Math.round(processedCount / (exportDuration / 1000))
      });

    } catch (err) {
      logger.error("Export failed catastrophically", {
        error: err.message,
        stack: err.stack,
        duration: Date.now() - exportStartTime
      });
      if (cursor) {
        try {
          await cursor.close();
        } catch (closeErr) {
          logger.error("Failed to close cursor during error cleanup", closeErr);
        }
      }

      if (!res.headersSent) {
        return error(res, {
          status: 500,
          message: "Export processing failed",
          code: "EXPORT_PROCESSING_FAILED"
        });
      } else {
        res.end();
      }
    }
  }

  // Map the UI column keys to the export column definitions, preserving the
  // order the user selected. Falls back to all columns when none specified.
  _resolveExportColumns(columnsParam) {
    if (!columnsParam) return this.exportColumns;

    const requested = String(columnsParam)
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (!requested.length) return this.exportColumns;

    // A few UI column keys differ from the export schema keys; map them so the
    // user's selection still resolves to the right field.
    const aliasMap = {
      cid: "callerId",
      caller_id: "callerId",
      timestamp: "callTimestamp",
      // The table "Status" column displays the disposition.
      status: "disposition",
    };

    const byKey = new Map(this.exportColumns.map((col) => [col.key, col]));
    const resolved = [];
    const seen = new Set();

    for (const key of requested) {
      const normalized = byKey.has(key) ? key : aliasMap[key];
      const col = normalized && byKey.get(normalized);
      if (col && !seen.has(col.key)) {
        resolved.push(col);
        seen.add(col.key);
      }
    }

    return resolved.length ? resolved : this.exportColumns;
  }

  async _streamCSVExport(res, cursor, processedCount, lastProgressLog, exportColumns = this.exportColumns) {
    return new Promise((resolve, reject) => {
      let isFirstChunk = true;

      const processRecord = (record) => {
        try {
          const transformed = this.recordsService._transformRecord(record);
          const csvRow = this._convertToCSVRow(transformed, exportColumns);

          processedCount++;
          const now = Date.now();
          if (processedCount % 10000 === 0 || now - lastProgressLog > 30000) {
            logger.info(`CSV export progress: ${processedCount.toLocaleString()} records`);
            lastProgressLog = now;
          }

          return csvRow;
        } catch (transformErr) {
          logger.warn("Failed to transform record for CSV", {
            recordId: record._id,
            error: transformErr.message
          });
          return ''; // Skip problematic records
        }
      };

      const processBatch = async () => {
        try {
          const batch = [];
          let record;
          let batchSize = 0;

          while (batchSize < 1000 && (record = await cursor.next())) {
            batch.push(record);
            batchSize++;
          }

          if (batch.length === 0) {
            res.end();
            resolve();
            return;
          }
          const csvRows = batch.map(processRecord).filter(row => row !== '');

          if (csvRows.length > 0) {
            if (isFirstChunk) {
              const headers = exportColumns.map(col => col.header);
              res.write(headers.join(',') + '\n');
              isFirstChunk = false;
            }

            res.write(csvRows.join('\n') + '\n');
          }
          setImmediate(processBatch);

        } catch (batchErr) {
          if (batchErr.message.includes('Cursor is closed')) {
            res.end();
            resolve();
          } else {
            reject(batchErr);
          }
        }
      };
      processBatch().catch(reject);

      res.on('close', () => {
        cursor.close().catch(() => { });
        resolve();
      });
    });
  }

  async _streamExcelExport(res, cursor, processedCount, lastProgressLog, exportColumns = this.exportColumns) {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: false,
      useSharedStrings: false
    });

    const worksheet = workbook.addWorksheet('Call Records');
    // Setting `columns` writes the header row automatically. We intentionally
    // do NOT add a second key-row, which previously corrupted the layout.
    worksheet.columns = exportColumns;

    try {
      let record;

      while ((record = await cursor.next())) {
        try {
          const transformed = this.recordsService._transformRecord(record);
          const rowData = this._convertToExcelRow(transformed, exportColumns);

          worksheet.addRow(rowData).commit();
          processedCount++;
          if (processedCount % 5000 === 0) {
            logger.info(`Excel export progress: ${processedCount.toLocaleString()} records`);
            lastProgressLog = Date.now();
          }
          if (processedCount % 10000 === 0) {
            if (global.gc) {
              global.gc();
            }
          }

        } catch (transformErr) {
          logger.warn("Failed to transform record for Excel", {
            recordId: record._id,
            error: transformErr.message
          });
          continue;
        }
      }

      await workbook.commit();
      logger.info(`Excel export completed: ${processedCount} records`);

    } catch (err) {
      await workbook.rollback();
      throw err;
    } finally {
      await cursor.close();
    }
  }

  // Strictly resolve a single export cell value for a column. Keeping this in
  // one place guarantees CSV and XLSX stay column-accurate (no field bleed).
  _resolveExportValue(record, key) {
    switch (key) {
      case "callTimestamp":
        return formatEST(record.callTimestamp);
      case "disposition":
        return record.disposition || record.qc?.disposition || "";
      case "sub_disposition":
        return record.sub_disposition || record.qc?.sub_disposition || "";
      case "reason":
        return record.reason || record.qc?.reason || "";
      case "summary":
        return record.summary || record.qc?.summary || "";
      case "income":
        return record.income || "";
      default: {
        const value = record[key];
        return value == null ? "" : value;
      }
    }
  }

  _convertToCSVRow(record, exportColumns = this.exportColumns) {
    const fields = exportColumns.map((col) => {
      const value = this._resolveExportValue(record, col.key);
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    });

    return fields.join(",");
  }

  _convertToExcelRow(record, exportColumns = this.exportColumns) {
    const row = {};
    exportColumns.forEach((col) => {
      // Key by `col.key` so values land in the correct ExcelJS column.
      row[col.key] = this._resolveExportValue(record, col.key);
    });
    return row;
  }

  async getStats(req, res) {
    try {
      const startTime = process.hrtime();
      const {
        datePreset,
        startDate,
        endDate,
        campaign,
        publisher,
        disposition,
        status,
        realtime,
        system,
        target,
        buyer,
      } = req.query;

      const filters = {
        datePreset,
        startDate,
        endDate,
        campaign,
        publisher,
        disposition,
        status,
        system,
        target,
        buyer,
      };

      logger.debug("Fetching statistics", { filters, realtime });

      let stats;
      if (realtime === "true") {
        stats = await this.statsService.getRealTimeStats();
      } else {
        stats = await this.statsService.getStats(filters);
      }

      const duration = process.hrtime(startTime);
      const durationMs = (duration[0] * 1000 + duration[1] / 1000000).toFixed(
        2
      );

      logger.metric("stats_query_duration", durationMs, {
        type: realtime ? "realtime" : "historical",
        filters: Object.keys(filters).filter((k) => filters[k]),
      });

      return success(res, {
        ...stats,
        query: {
          duration: `${durationMs}ms`,
          filters,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.error("Failed to fetch statistics", {
        error: err.message,
        stack: err.stack,
        query: req.query,
      });

      return error(res, {
        status: err.status || 500,
        message: err.message || "Failed to fetch statistics",
        code: "STATS_QUERY_FAILED",
      });
    }
  }

  async getRecords(req, res) {
    try {
      const startTime = process.hrtime();

      const {
        page = 1,
        limit = 25,
        sortBy = "callTimestamp",
        sortDir = "desc",
        search = "",
        datePreset,
        startDate,
        endDate,
        campaign,
        publisher,
        disposition,
        status,
        target,
        buyer,
        system,
      } = req.query;

      const filters = {
        datePreset,
        startDate,
        endDate,
        campaign,
        publisher,
        disposition,
        status,
        search,
        target,
        buyer,
        system,
      };

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sortBy,
        sortDir,
      };

      logger.debug("Fetching records", { filters, options });

      const result = await this.recordsService.getRecords(filters, options);

      const duration = process.hrtime(startTime);
      const durationMs = (duration[0] * 1000 + duration[1] / 1000000).toFixed(
        2
      );

      logger.metric("records_query_duration", durationMs, {
        page: options.page,
        limit: options.limit,
        total: result.meta.total,
        filters: Object.keys(filters).filter((k) => filters[k]),
      });

      return success(res, {
        ...result,
        query: {
          duration: `${durationMs}ms`,
          filters,
          options,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.error("Failed to fetch records", {
        error: err.message,
        stack: err.stack,
        query: req.query,
      });

      return error(res, {
        status: err.status || 500,
        message: err.message || "Failed to fetch records",
        code: "RECORDS_QUERY_FAILED",
      });
    }
  }

  // Stream a call recording through the API. This fixes CallGrid playback,
  // where the raw recording URL redirects / lacks CORS / returns an
  // unexpected content-type, all of which break the browser <audio> element.
  async streamRecording(req, res) {
    try {
      const { id } = req.params;
      const record = await CallRecord.findById(id)
        .select("recordingUrl")
        .lean()
        .maxTimeMS(5000);

      if (!record || !record.recordingUrl) {
        return error(res, {
          status: 404,
          message: "Recording not found",
          code: "RECORDING_NOT_FOUND",
        });
      }

      let url = String(record.recordingUrl).trim();

      // Some providers (CallGrid) store the recording as a JSON string
      // like {"url":"https://..."}. Unwrap it before fetching.
      if (url.startsWith("{")) {
        try {
          const parsed = JSON.parse(url);
          url = String(parsed.url || parsed.recording_url || "").trim();
        } catch (e) {
          /* fall through to validation below */
        }
      }

      if (!/^https?:\/\//i.test(url)) {
        return error(res, {
          status: 422,
          message: "Recording URL is invalid",
          code: "RECORDING_URL_INVALID",
        });
      }

      await this._streamRecordingFrom(res, url, req.headers.range, 0);
    } catch (err) {
      const upstreamStatus = err.response?.status;
      logger.error("Failed to stream recording", {
        recordId: req.params.id,
        error: err.message,
        upstreamStatus,
      });
      if (!res.headersSent) {
        return error(res, {
          status: 502,
          message: "Failed to load recording",
          code: "RECORDING_FETCH_FAILED",
          details: upstreamStatus
            ? `Upstream responded ${upstreamStatus}`
            : err.message,
        });
      }
      res.end();
    }
  }

  // Fetch `url` and pipe it to the response. Handles CallGrid endpoints that
  // return JSON ({"url": signedS3Url}) or redirect, and direct audio URLs.
  async _streamRecordingFrom(res, url, range, depth) {
    if (depth > 4) {
      throw new Error("Too many recording redirects");
    }

    const upstream = await axios.get(url, {
      responseType: "stream",
      maxRedirects: 5, // follow HTTP-level redirects to signed URLs
      timeout: 30000,
      // Some provider endpoints reject requests without a browser-like UA.
      // CallGrid's recordings API additionally requires a bearer token (the
      // same one the transcription service uses). Don't leak it to other hosts
      // (e.g. the signed S3 URL we get redirected/pointed to).
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "*/*",
        ...(/callgrid\.com/i.test(url) && process.env.CALLGRID_TOKEN
          ? { Authorization: `Bearer ${process.env.CALLGRID_TOKEN}` }
          : {}),
        ...(range ? { Range: range } : {}),
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const contentType = String(upstream.headers["content-type"] || "").toLowerCase();
    const isAudio =
      contentType.startsWith("audio/") ||
      contentType.startsWith("video/") ||
      contentType.includes("octet-stream") ||
      contentType.includes("mpeg") ||
      contentType.includes("mp4") ||
      contentType.includes("wav") ||
      contentType.includes("ogg");

    // JSON wrapper, or an ambiguous/text response that may contain JSON:
    // buffer a small amount and try to resolve a nested audio URL.
    if (!isAudio) {
      const chunks = [];
      let size = 0;
      for await (const chunk of upstream.data) {
        chunks.push(chunk);
        size += chunk.length;
        if (size > 256 * 1024) break; // safety cap
      }
      const body = Buffer.concat(chunks).toString("utf8").trim();

      let nextUrl;
      try {
        const parsed = JSON.parse(body);
        nextUrl = parsed.url || parsed.recording_url || parsed.location || parsed.uri;
      } catch (e) {
        // Not JSON. If the body itself is a bare URL, use it.
        if (/^https?:\/\/\S+$/i.test(body)) nextUrl = body;
      }

      if (!nextUrl) {
        throw new Error(
          `Unresolvable recording response (content-type: ${contentType || "none"})`
        );
      }
      nextUrl = String(nextUrl).trim();
      if (nextUrl === url) throw new Error("Recording URL resolution loop");
      return this._streamRecordingFrom(res, nextUrl, range, depth + 1);
    }

    res.setHeader("Content-Type", contentType || "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");
    if (upstream.headers["content-length"]) {
      res.setHeader("Content-Length", upstream.headers["content-length"]);
    }
    if (upstream.headers["content-range"]) {
      res.setHeader("Content-Range", upstream.headers["content-range"]);
    }

    res.status(upstream.status === 206 ? 206 : 200);

    upstream.data.on("error", (streamErr) => {
      logger.error("Recording stream error", { error: streamErr.message });
      if (!res.headersSent) res.status(502).end();
      else res.end();
    });

    upstream.data.pipe(res);
  }

  async getRecordDetail(req, res) {
    try {
      const startTime = process.hrtime();
      const { id } = req.params;

      if (!id) {
        return error(res, {
          status: 400,
          message: "Record ID is required",
          code: "MISSING_RECORD_ID",
        });
      }

      logger.debug("Fetching record detail", { recordId: id });

      const record = await this.recordsService.getRecordById(id);

      const duration = process.hrtime(startTime);
      const durationMs = (duration[0] * 1000 + duration[1] / 1000000).toFixed(
        2
      );

      logger.debug("Record detail fetched", {
        recordId: id,
        duration: `${durationMs}ms`,
      });

      return success(res, {
        data: record,
        query: {
          duration: `${durationMs}ms`,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.error("Failed to fetch record detail", {
        error: err.message,
        recordId: req.params.id,
        stack: err.stack,
      });

      if (err.message.includes("not found")) {
        return error(res, {
          status: 404,
          message: "Record not found",
          code: "RECORD_NOT_FOUND",
        });
      }

      return error(res, {
        status: 500,
        message: err.message || "Failed to fetch record details",
        code: "RECORD_DETAIL_FAILED",
      });
    }
  }

  async getFieldValues(req, res) {
    try {
      const { field } = req.params;
      const {
        datePreset,
        startDate,
        endDate,
        campaign,
        publisher,
        disposition,
        status,
      } = req.query;

      const filters = {
        datePreset,
        startDate,
        endDate,
        campaign,
        publisher,
        disposition,
        status,
      };

      logger.debug("Fetching field values", { field, filters });

      const values = await this.recordsService.getFieldValues(field, filters);

      return success(res, {
        field,
        values,
        count: values.length,
        filters,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Failed to fetch field values", {
        error: err.message,
        field: req.params.field,
        stack: err.stack,
      });

      return error(res, {
        status: err.status || 500,
        message: err.message || "Failed to fetch field values",
        code: "FIELD_VALUES_FAILED",
      });
    }
  }

  async getCallTimeline(req, res) {
    try {
      const { interval = "hour" } = req.query;
      const {
        datePreset,
        startDate,
        endDate,
        campaign,
        publisher,
        disposition,
        status,
      } = req.query;

      const filters = {
        datePreset,
        startDate,
        endDate,
        campaign,
        publisher,
        disposition,
        status,
      };

      logger.debug("Fetching call timeline", { interval, filters });

      const timeline = await this.recordsService.getCallTimeline(
        filters,
        interval
      );

      return success(res, {
        interval,
        data: timeline,
        filters,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Failed to fetch call timeline", {
        error: err.message,
        interval: req.query.interval,
        stack: err.stack,
      });

      return error(res, {
        status: 500,
        message: err.message || "Failed to fetch call timeline",
        code: "TIMELINE_FAILED",
      });
    }
  }
}

module.exports = new CallController();