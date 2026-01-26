const mongoose = require("mongoose");

const dailyCallSchema = new mongoose.Schema({
  date: { type: String, required: true },
  completedCalls: { type: Number, default: 0 },
  paidCalls: { type: Number, default: 0 }
});

const capSchema = new mongoose.Schema({
  name: { type: String, required: true },   
  target_name: { type: String, default: "" },
  target: { type: Number, default: 0 },

  dailyCalls: [dailyCallSchema],

  totalCompletedCalls: { type: Number, default: 0 },
  totalPaidCalls: { type: Number, default: 0 },

  enabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Caps", capSchema);
