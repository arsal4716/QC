const AdvancedStatsService = require("../services/statsService");
const AdvancedRecordsService = require("../services/recordsService");
const { success, error } = require("../utils/apiResponse");
const logger = require("../utils/logger");
const ExcelJS = require("exceljs");
const { Transform, pipeline, Readable } = require("stream"); 
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);
const exportColumns = [
  { header: "Time Stamp", key: "callTimestamp" },
  { header: "Publisher", key: "systemName" },
  { header: "Caller ID", key: "callerId" },
  { header: "Status", key: "disposition" },
  { header: "Sub Disposition", key: "subDisposition" },
  { header: "Duration (sec)", key: "durationSec" },
  { header: "Campaign Name", key: "campaignName" },
  { header: "Reason", key: "reason" },
  { header: "Summary", key: "summary" },
  { header: "Transcript", key: "transcript" },
  { header: "Inbound Phone Number", key: "inboundNumber" },
  { header: "Recording Link", key: "recordingUrl" },
  { header: "System Call ID", key: "systemCallId" },
  { header: "System Publisher ID", key: "systemPublisherId" },
  { header: "Target", key: "target_name" },
];

class CallController {
  constructor() {
    this.statsService = AdvancedStatsService;
    this.recordsService = AdvancedRecordsService;
    this.getStats = this.getStats.bind(this);
    this.getRecords = this.getRecords.bind(this);
    this.getRecordDetail = this.getRecordDetail.bind(this);
    this.exportRecords = this.exportRecords.bind(this);
    this.getFieldValues = this.getFieldValues.bind(this);
    this.getCallTimeline = this.getCallTimeline.bind(this);
    this.bulkUpdate = this.bulkUpdate.bind(this);
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

async exportRecords(req, res) {
  try {
    const startTime = process.hrtime();
    const {
      fmt = "csv",
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
      sortBy = "callTimestamp",
      sortDir = "desc",
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
      sortBy,
      sortDir,
    };

    logger.info("Starting export", { format: fmt, filters, options });
    const records = await this.recordsService.getRecords(filters, {
      ...options,
      page: 1,   
      limit: 1000000,   
    });

    if (!records || !records.data.length) {
      return error(res, {
        status: 404,
        message: "No records found for export",
        code: "NO_RECORDS_FOR_EXPORT",
      });
    }

    const data = records.data;

    const duration = process.hrtime(startTime);
    const durationMs = (duration[0] * 1000 + duration[1] / 1000000).toFixed(2);

    logger.metric("export_duration", durationMs, {
      format: fmt,
      recordCount: data.length,
      filters: Object.keys(filters).filter((k) => filters[k]),
    });

    if (fmt === "xlsx") {
      return this._exportExcel(res, data);
    } else {
      return this._exportCSV(res, data);
    }
  } catch (err) {
    logger.error("Export failed", {
      error: err.message,
      stack: err.stack,
      query: req.query,
    });

    return error(res, {
      status: 500,
      message: err.message || "Failed to export records",
      code: "EXPORT_FAILED",
    });
  }
}


  async bulkUpdate(req, res) {
    try {
      const { ids, updates } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return error(res, {
          status: 400,
          message: "Record IDs are required",
          code: "MISSING_RECORD_IDS",
        });
      }

      if (
        !updates ||
        typeof updates !== "object" ||
        Object.keys(updates).length === 0
      ) {
        return error(res, {
          status: 400,
          message: "Update data is required",
          code: "MISSING_UPDATE_DATA",
        });
      }

      logger.info("Bulk update requested", {
        recordCount: ids.length,
        updates: Object.keys(updates),
      });

      const result = await this.recordsService.bulkUpdate(ids, updates);

      logger.audit("records_bulk_update", req.user, {
        recordCount: ids.length,
        updates,
        result,
      });

      return success(res, {
        updatedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        recordIds: ids,
        updates,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Bulk update failed", {
        error: err.message,
        stack: err.stack,
        recordCount: req.body.ids?.length,
      });

      return error(res, {
        status: 500,
        message: err.message || "Failed to update records",
        code: "BULK_UPDATE_FAILED",
      });
    }
  }
_exportExcel(res, records) {
  try {
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=call-records-${Date.now()}.xlsx`
    );

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const worksheet = workbook.addWorksheet("Call Records");

    worksheet.columns = exportColumns.map(c => ({ ...c, width: 20 }));

    for (const record of records) {
      worksheet.addRow({
        callTimestamp: record.callTimestamp,
        systemName: record.systemName,
        callerId: record.callerId,
        disposition: record.qc?.disposition,
        subDisposition: record.qc?.sub_disposition,
        durationSec: record.durationSec,
        campaignName: record.campaignName,
        reason: record.qc?.reason,
        summary: record.qc?.summary,
        transcript: record.transcript,
        inboundNumber: record.ringbaRaw?.caller_number,
        recordingUrl: record.recordingUrl,
        systemCallId: record.systemCallId,
        systemPublisherId: record.systemPublisherId,
        target_name: record.target_name,
      }).commit();
    }

    worksheet.commit();
    workbook.commit();
  } catch (err) {
    throw new Error(`Excel export failed: ${err.message}`);
  }
}
_exportCSV(res, records) {
  try {
    const headers = exportColumns.map(c => c.header);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=call-records-${Date.now()}.csv`
    );

    res.write(headers.join(",") + "\n");

    const transform = new Transform({
      objectMode: true,
      transform(record, encoding, callback) {
        try {
          const row = exportColumns.map(col => {
            let value = record[col.key];

            // special cases for nested fields
            if (col.key === "disposition") value = record.qc?.disposition;
            if (col.key === "subDisposition") value = record.qc?.sub_disposition;
            if (col.key === "reason") value = record.qc?.reason;
            if (col.key === "summary") value = record.qc?.summary;
            if (col.key === "inboundNumber") value = record.ringbaRaw?.caller_number;

            return value != null ? `"${String(value).replace(/"/g, '""')}"` : "";
          });

          callback(null, row.join(",") + "\n");
        } catch (err) {
          callback(err);
        }
      },
    });

    (async () => {
      await streamPipeline(
        Readable.from(records, { objectMode: true }),
        transform,
        res
      );
    })();
  } catch (err) {
    throw new Error(`CSV export failed: ${err.message}`);
  }
}
}
module.exports = new CallController();
