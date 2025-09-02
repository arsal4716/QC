const statsService = require("../services/statsService");
const recordsService = require("../services/recordsService");
const { success, error } = require("../utils/apiResponse");
const ExcelJS = require("exceljs");
exports.getStats = async (req, res) => {
  try {
    const { datePreset, startDate, endDate, campaign, disposition } = req.query;
    const filters = { datePreset, startDate, endDate, campaign, disposition };
    
    const stats = await statsService.getStats(filters);
    return success(res, stats);
  } catch (err) {
    console.error("Stats Controller Error:", err);
    return error(res, { 
      status: 500, 
      message: "Failed to fetch statistics" 
    });
  }
};

exports.getRecords = async (req, res) => {
  try {
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
      status 
    } = req.query;

    const filters = { datePreset, startDate, endDate, campaign, publisher, disposition, status };
    const options = { page, limit, sortBy, sortDir, search };

    const result = await recordsService.getRecords(filters, options);
    console.log("records response", result);
    return success(res, result);
  } catch (err) {
    console.error("Records Controller Error:", err);
    return error(res, { 
      status: 500, 
      message: "Failed to fetch records" 
    });
  }
};


exports.getRecordDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await recordsService.getRecordById(id);
    return success(res, record);
  } catch (err) {
    console.error("Record Detail Error:", err);
    return error(res, { 
      status: 404, 
      message: "Record not found" 
    });
  }
};

function mapRecordForExport(r) {
  return {
    "Time Stamp": r.callTimestamp,
    "Publisher": r.systemName,
    "callerId": r.callerId,
    "Status": r.qc?.disposition,
    "Sub Disposition": r.qc?.sub_disposition,
    "Duration": r.durationSec,
    "Campaign Name": r.campaignName,
    "Reason": r.qc?.reason,
    "Summary": r.qc?.summary,
    "Transcript": r.transcript,
    "Inbound Phone Number": r.ringbaRaw?.caller_number,
    "Recording Link": r.recordingUrl,
    "System Call ID": r.systemCallId,
    "System Publisher ID": r.systemPublisherId,
  };
}


exports.exportRecords = async (req, res) => {
  try {
    const { fmt = "csv" } = req.query;
    const records = await recordsService.exportRecords(req.query) || [];
    const mapped = records.map(mapRecordForExport);

    if (!mapped.length) {
      return res.status(400).json({ success: false, message: "No records to export" });
    }

    if (fmt === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Records");
      sheet.columns = Object.keys(mapped[0]).map((k) => ({ header: k, key: k }));
      mapped.forEach((row) => sheet.addRow(row));

      res.setHeader("Content-Disposition", "attachment; filename=call-records.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      await workbook.xlsx.write(res);
      res.end();
    } else {
      const headers = Object.keys(mapped[0]).join(",");
      const rows = mapped.map((r) =>
        Object.values(r)
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=call-records.csv");
      res.send([headers, ...rows].join("\n"));
    }
  } catch (err) {
    console.error("Export Error:", err);
    res.status(500).json({ success: false, message: "Failed to export records" });
  }
};
