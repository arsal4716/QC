const mongoose = require('mongoose');

const costRecordSchema = new mongoose.Schema({
  callId: { type: mongoose.Schema.Types.ObjectId, ref: 'CallRecord' },
  deepgramCost: { type: Number, default: 0 },
  openaiCost: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CostRecord', costRecordSchema);