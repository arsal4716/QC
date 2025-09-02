const CallRecord = require('../models/CallRecord');
const { buildMatchStage } = require('../utils/buildMatchStage');

class RecordsService {
  async getRecords(filters, { page = 1, limit = 25, sortBy = 'callTimestamp', sortDir = 'desc', search = '' }) {
    page = Math.max(1, Number(page));
    limit = Math.min(200, Math.max(1, Number(limit)));

    const match = buildMatchStage(filters);

    if (search) {
      const re = new RegExp(search, 'i');
      match.$or = [
        { callerId: re },
        { campaignName: re },
        { publisherName: re },
        { 'qc.reason': re },
        { 'qc.summary': re },
        { transcript: re }
      ];
    }

    const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };
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
          publisherName: 1,
          callerId: 1,
          durationSec: 1,
          recordingUrl: 1,
          systemCallId: 1,
          systemPublisherId: 1,
          'qc.disposition': 1,
          'qc.sub_disposition': 1,
          'qc.reason': 1,
          'qc.summary': 1,
          'qc.sentiment': 1,
          transcript: 1,
          'ringbaRaw.caller_number': 1
        })
        .lean()
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  async getRecordById(id) {
    return CallRecord.findById(id)
      .select({
        _id: 1,
        callTimestamp: 1,
        campaignName: 1,
        publisherName: 1,
        systemName: 1,
        callerId: 1,
        durationSec: 1,
        recordingUrl: 1,
        systemCallId: 1,
        systemPublisherId: 1,
        systemBuyerId: 1,
        qc: 1,
        transcript: 1,
        labeledTranscript: 1,
        ringbaRaw: 1
      })
      .lean();
  }

  async exportRecords(q) {
    const match = buildMatchStage(q);
    return CallRecord.find(match)
      .select({
        callTimestamp: 1,
        campaignName: 1,
        publisherName: 1,
        callerId: 1,
        'qc.disposition': 1,
        'qc.sub_disposition': 1,
        'qc.reason': 1,
        'qc.summary': 1,
        'qc.sentiment': 1,
        durationSec: 1,
        transcript: 1,
        'ringbaRaw.caller_number': 1,
        recordingUrl: 1,
        systemCallId: 1,
        systemPublisherId: 1
      })
      .lean();
  }
}

module.exports = new RecordsService();