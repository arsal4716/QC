const CallRecord = require('../models/CallRecord');
const { buildMatchStage } = require('../utils/buildMatchStage');

class StatsService {
  async getStats(filters = {}) {
    const match = buildMatchStage(filters);

   const pipeline = [
  { $match: match },
  {
    $group: {
      _id: null,
      totalProcessed: { $sum: 1 },
      sale: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Sale'] }, 1, 0] } },
      notInterested: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Not Interested'] }, 1, 0] } },
      notQualified: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Not Qualified'] }, 1, 0] } },
      dnc: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'DNC'] }, 1, 0] } },
      voicemail: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Voicemail'] }, 1, 0] } },
      techIssues: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Tech Issues'] }, 1, 0] } },
      dwspi: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'DWSPI'] }, 1, 0] } },
      unresponsive: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Unresponsive'] }, 1, 0] } },
      hungup: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Hungup'] }, 1, 0] } },
      callback: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Callback'] }, 1, 0] } },
      ivr: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'IVR'] }, 1, 0] } },
      subsidy: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Subsidy'] }, 1, 0] } },
      languageBarrier: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Language Barrier'] }, 1, 0] } },
      misdialed: { $sum: { $cond: [{ $eq: ['$qc.disposition', 'Misdialed'] }, 1, 0] } },
    }
  },
  { $project: { _id: 0 } }
];

    const result = (await CallRecord.aggregate(pipeline, { allowDiskUse: true }))[0] || {};
    return { grandTotal: result.totalProcessed || 0, ...defaultStats(), ...result };
  }
}

function defaultStats() {
  return {
    totalProcessed: 0,
    sale: 0,
    notInterested: 0,
    notQualified: 0,
    dnc: 0,
    voicemail: 0,
    techIssues: 0,
    dwspi: 0,
    unresponsive: 0,
    hungup: 0,
    callback: 0,
    ivr: 0,
    subsidy: 0,
    languageBarrier: 0,
    misdialed: 0
  };
}

module.exports = new StatsService();
