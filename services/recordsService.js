const CallRecord = require("../models/CallRecord");
const { buildMatchStage } = require("../utils/buildMatchStage");

class RecordsService {
  async getRecords(
    filters,
    {
      page = 1,
      limit = 25,
      sortBy = "callTimestamp",
      sortDir = "desc",
      search = "",
    }
  ) {
    page = Math.max(1, Number(page));
    limit = Math.min(200, Math.max(1, Number(limit)));

    const match = buildMatchStage(filters);

    if (search) {
      const re = new RegExp(search, "i");
      match.$or = [
        { callerId: re },
        { campaignName: re },
        { publisherName: re },
        { "qc.reason": re },
        { "qc.summary": re },
        { transcript: re },
      ];
    }

    const sort = { [sortBy]: sortDir === "asc" ? 1 : -1 };
    const [total, data] = await Promise.all([
      CallRecord.countDocuments(match),

      CallRecord.find(match)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select({
          _id: 1,
          callTimestamp: 1,
          campaignName: 1,
          systemBuyerId: 1,
          target_name: 1,
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
          transcript: 1,
          ringbaRaw: 1 
        })
        .lean(),
    ]);
    const transformedData = data.map(record => ({
      ...record,
      durationSec: record.ringbaRaw?.duration_seconds || record.durationSec
    }));

    return {
      data: transformedData,
      meta: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getRecordById(id) {
    const record = await CallRecord.findById(id)
      .select({
        _id: 1,
        callTimestamp: 1,
        campaignName: 1,
        publisherName: 1,
        target_name: 1,
        systemName: 1,
        callerId: 1,
        recordingUrl: 1,
        systemCallId: 1,
        systemPublisherId: 1,
        systemBuyerId: 1,
        qc: 1,
        transcript: 1,
        labeledTranscript: 1,
        ringbaRaw: 1,
        durationSec: 1
      })
      .lean();
    if (record) {
      record.durationSec = record.ringbaRaw?.duration_seconds || record.durationSec;
    }

    return record;
  }

  async exportRecords(q) {
    const match = buildMatchStage(q);
    const data = await CallRecord.find(match)
      .select({
        callTimestamp: 1,
        campaignName: 1,
        publisherName: 1,
        target_name: 1,
        callerId: 1,
        "qc.disposition": 1,
        "qc.sub_disposition": 1,
        "qc.reason": 1,
        "qc.summary": 1,
        "qc.sentiment": 1,
        transcript: 1,
        recordingUrl: 1,
        systemCallId: 1,
        systemBuyerId: 1,
        systemPublisherId: 1,
        ringbaRaw: 1
      })
      .lean();

    return data.map(record => ({
      ...record,
      durationSec: record.ringbaRaw?.duration_seconds || record.durationSec
    }));
  }
}

module.exports = new RecordsService();