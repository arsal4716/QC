const mongoose = require("mongoose");

const capSchema = new mongoose.Schema({
  name: String,
  number: String,
  concurrencyCap: Number,
  hourlyCap: Number,
  dailyCap: Number,
  monthlyCap: Number,
  allTimeCap: Number,
  enabled: Boolean,
  target: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cap", capSchema);
