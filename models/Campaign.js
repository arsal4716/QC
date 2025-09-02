const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema({

  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true, index: true },}, { timestamps: true });

module.exports = mongoose.model("Campaign", CampaignSchema);