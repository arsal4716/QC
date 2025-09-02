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
        { 'qc.summary': re }
      ];
    }

    const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

    const pipeline = [
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                callTimestamp: 1,
                campaignName: 1,
                systemName: "$publisherName", 
                callerId: 1,
                durationSec: 1,
                recordingUrl: 1,
                systemCallId: 1,
                systemPublisherId: 1,
                "qc.disposition": 1,
                "qc.sub_disposition": 1,
                "qc.reason": 1,
                "qc.summary": 1,
                transcript: 1,
                "ringbaRaw.caller_number": 1
              }
            }
          ],
          meta: [{ $count: 'total' }]
        }
      }
    ];

    const [{ data, meta }] = await CallRecord.aggregate(pipeline, { allowDiskUse: true });
    const total = meta?.[0]?.total || 0;
    return { data, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async getRecordById(id) {
    return CallRecord.findById(id).lean();
  }

  async exportRecords(q) {
    const match = buildMatchStage(q);
    return CallRecord.find(match)
      .select({
        callTimestamp: 1,
        systemName: "$publisherName",  
        callerId: 1,
        "qc.disposition": 1,
        "qc.sub_disposition": 1,
        durationSec: 1,
        campaignName: 1,
        "qc.reason": 1,
        "qc.summary": 1,
        transcript: 1,
        "ringbaRaw.caller_number": 1,
        recordingUrl: 1,
        systemCallId: 1,
        systemPublisherId: 1
      })
      .lean();
  }
}

module.exports = new RecordsService();
