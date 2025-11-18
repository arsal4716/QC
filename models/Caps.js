const mongoose = require("mongoose");

const dailyCallSchema = new mongoose.Schema({
  date: { type: String, required: true },
  completedCalls: { type: Number, default: 0 },
  paidCalls: { type: Number, default: 0 }
});

const capSchema = new mongoose.Schema({
  name: String,
  target: { type: Number, default: 0 },
  dailyCalls: [dailyCallSchema], 
  totalCompletedCalls: { type: Number, default: 0 },
  totalPaidCalls: { type: Number, default: 0 }, 
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cap", capSchema);