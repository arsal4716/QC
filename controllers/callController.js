const AdvancedStatsService = require("../services/statsService");
const AdvancedRecordsService = require("../services/recordsService");
const QueryBuilder = require("../utils/queryBuilder");
const CallRecord = require("../models/CallRecord");
const { success, error } = require("../utils/apiResponse");
const logger = require("../utils/logger");
const ExcelJS = require("exceljs");
const { Transform, pipeline, Readable } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);
const os = require("os");

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

      const finalQuery = queryBuilder._buildFinalQuery();
      const estimatedCount = await CallRecord.countDocuments(finalQuery)
        .maxTimeMS(10000)
        .catch(() => 0); 

      logger.info(`Export estimated records: ${estimatedCount.toLocaleString()}`);

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

      // Create cursor with optimized settings for large datasets
      cursor = await CallRecord.find(finalQuery)
        .select(this.recordsService.defaultProjection)
        .sort(queryBuilder.options.sort || { callTimestamp: -1 })
        .lean()
        .batchSize(5000)
        .maxTimeMS(300000)
        .cursor();

      let processedCount = 0;
      let lastProgressLog = Date.now();

      if (format === 'csv') {
        await this._streamCSVExport(res, cursor, processedCount, lastProgressLog);
      } else {
        await this._streamExcelExport(res, cursor, processedCount, lastProgressLog);
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

  async _streamCSVExport(res, cursor, processedCount, lastProgressLog) {
    return new Promise((resolve, reject) => {
      let isFirstChunk = true;

      const processRecord = (record) => {
        try {
          const transformed = this.recordsService._transformRecord(record);
          const csvRow = this._convertToCSVRow(transformed);
          
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
              const headers = this.exportColumns.map(col => col.header);
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
        cursor.close().catch(() => {});
        resolve(); 
      });
    });
  }

  async _streamExcelExport(res, cursor, processedCount, lastProgressLog) {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: false,
      useSharedStrings: false
    });

    const worksheet = workbook.addWorksheet('Call Records');
        worksheet.columns = this.exportColumns;

    try {
      let record;
      let isFirstRecord = true;

      while ((record = await cursor.next())) {
        try {
          const transformed = this.recordsService._transformRecord(record);
          const rowData = this._convertToExcelRow(transformed);
          
          if (isFirstRecord) {
            worksheet.addRow(Object.keys(rowData)).commit();
            isFirstRecord = false;
          }
          
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

  _convertToCSVRow(record) {
    const fields = this.exportColumns.map(col => {
      let value = record[col.key];
            if (col.key === 'disposition') value = record.qc?.disposition || record.disposition;
      if (col.key === 'sub_disposition') value = record.qc?.sub_disposition || record.sub_disposition;
      if (col.key === 'reason') value = record.qc?.reason || record.reason;
      if (col.key === 'summary') value = record.qc?.summary || record.summary;
      
      if (value == null) value = '';
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    });

    return fields.join(',');
  }

  _convertToExcelRow(record) {
    const row = {};
    
    this.exportColumns.forEach(col => {
      let value = record[col.key];
      
      if (col.key === 'disposition') value = record.qc?.disposition || record.disposition;
      if (col.key === 'sub_disposition') value = record.qc?.sub_disposition || record.sub_disposition;
      if (col.key === 'reason') value = record.qc?.reason || record.reason;
      if (col.key === 'summary') value = record.qc?.summary || record.summary;
      
      row[col.header] = value != null ? value : '';
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