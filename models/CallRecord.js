const mongoose = require("mongoose");

const QCSchema = new mongoose.Schema(
  {
    disposition: { type: String, trim: true, index: true },
    sub_disposition: { type: String, trim: true, index: true },
    reason: { type: String, trim: true },
    summary: { type: String, trim: true },
    sentiment: {
      type: String,
      enum: ["Positive", "Neutral", "Negative"],
      default: "Neutral",
      index: true,
      trim: true
    },
    confidence_level: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
      trim: true
    },
    key_moments: [{ type: String, trim: true }],
    objections_raised: [{ type: String, trim: true }],
    objections_overcome: {
      type: String,
      enum: ["Yes", "No", "Partial"],
      default: "No",
      trim: true
    }
  },
  { _id: false }
);

const CallRecordSchema = new mongoose.Schema(
  {
    systemCallId: { type: String, trim: true, index: true, unique: true },
    systemPublisherId: { type: String, trim: true, index: true },
    systemBuyerId: { type: String, trim: true, index: true },
    systemName: { type: String, trim: true, index: true },
    callTimestamp: { type: Date, index: true },
    campaignName: { type: String, trim: true, index: true },
    publisherName: { type: String, trim: true, index: true },
    callerId: { type: String, trim: true, index: true },
    inboundPhoneNumber: { type: String, trim: true },
    dialedNumber: { type: String, trim: true },
    durationSec: Number,
    cost: Number,
    recordingUrl: { type: String, trim: true },
    transcript: { type: String, trim: true },
    labeledTranscript: { type: String, trim: true },
    qc: QCSchema,
    ringbaRaw: Object
  },
  { timestamps: true }
);

CallRecordSchema.index({
  transcript: "text",
  "qc.summary": "text",
  "qc.reason": "text"
});

module.exports = mongoose.model("CallRecord", CallRecordSchema);
