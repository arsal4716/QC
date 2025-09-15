const mongoose = require("mongoose");
const { Schema } = mongoose;
const slugify = (str) =>
  str
    ? str
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    : "";

const QCSchema = new Schema(
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
    },
    confidence_level: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    key_moments: [{ type: String, trim: true }],
    objections_raised: [{ type: String, trim: true }],
    objections_overcome: {
      type: String,
      enum: ["Yes", "No", "Partial"],
      default: "No",
    },
  },
  { _id: false, timestamps: false }
);

const CallRecordSchema = new Schema(
  {
    systemCallId: {
      type: String,
      trim: true,
      index: true,
      unique: true,
      sparse: true,
    },
    systemPublisherId: { type: String, trim: true, index: true },
    systemBuyerId: { type: String, trim: true, index: true },
    systemBuyerSlug: { type: String, trim: true, index: true }, 
    target_name: { type: String, trim: true, index: true },
    targetSlug: { type: String, trim: true, index: true }, 
    systemName: { type: String, trim: true, index: true },
    callTimestamp: { type: Date, index: true },

    campaignName: { type: String, trim: true, index: true },
    campaignSlug: { type: String, trim: true, index: true },

    publisherName: { type: String, trim: true, index: true },
    publisherSlug: { type: String, trim: true, index: true }, 

    callerId: { type: String, trim: true, index: true },
    inboundPhoneNumber: { type: String, trim: true },
    dialedNumber: { type: String, trim: true },
    cost: { type: Number, min: 0 },
    recordingUrl: { type: String, trim: true },
    transcript: { type: String, trim: true },
    labeledTranscript: { type: String, trim: true },
    qc: QCSchema,
    ringbaRaw: { type: Schema.Types.Mixed },

    status: { type: String, trim: true, index: true },

    callStatus: {
      type: String,
      enum: [
        "queued",
        "processing",
        "transcribing",
        "labeling_speakers",
        "analyzing_disposition",
        "completed",
        "failed",
        "transcription_failed",
        "labeling_failed",
        "analysis_failed",
      ],
      default: "queued",
      index: true,
    },

    error: { type: String, trim: true },
    processingStartTime: { type: Date },
    processingEndTime: { type: Date },
    processingTime: { type: Number, default: 0, min: 0 },
    durationSec: { type: Number, min: 0 },
  },
  {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== "production",
    minimize: false,
    bufferCommands: false,
  }
);

CallRecordSchema.index({ callTimestamp: -1, campaignName: 1 });
CallRecordSchema.index({ callTimestamp: -1, systemName: 1 });
CallRecordSchema.index({ callTimestamp: -1, "qc.disposition": 1 });
CallRecordSchema.index({ campaignName: 1, callTimestamp: -1 });
CallRecordSchema.index({ systemName: 1, callTimestamp: -1 });
CallRecordSchema.index({ "qc.disposition": 1, callTimestamp: -1 });
CallRecordSchema.index({ status: 1, callTimestamp: -1 });
CallRecordSchema.index({ callTimestamp: -1, status: 1, "qc.disposition": 1 });

CallRecordSchema.index(
  {
    callerId: "text",
    campaignName: "text",
    publisherName: "text",
    "qc.reason": "text",
    "qc.summary": "text",
  },
  {
    name: "search_index",
    weights: {
      campaignName: 10,
      callerId: 8,
      publisherName: 6,
      "qc.reason": 4,
      "qc.summary": 2,
    },
    background: true,
  }
);

CallRecordSchema.index(
  { callTimestamp: -1 },
  {
    partialFilterExpression: { callStatus: "completed" },
  }
);

CallRecordSchema.virtual("calculatedDuration").get(function () {
  return this.ringbaRaw?.duration_seconds || this.durationSec || 0;
});
CallRecordSchema.pre("save", function (next) {
  if (this.campaignName) this.campaignSlug = slugify(this.campaignName);
  if (this.publisherName) this.publisherSlug = slugify(this.publisherName);
  if (this.systemBuyerId) this.systemBuyerSlug = slugify(this.systemBuyerId);
  if (this.target_name) {
    this.targetSlug = slugify(this.target_name);
  } else if (this.ringbaRaw?.target_name) {
    this.targetSlug = slugify(this.ringbaRaw.target_name);
  }

  if (this.ringbaRaw?.duration_seconds && !this.durationSec) {
    this.durationSec = this.ringbaRaw.duration_seconds;
  }
  next();
});

CallRecordSchema.statics.findByTimeRange = function (start, end, options = {}) {
  const query = { callTimestamp: { $gte: start, $lte: end } };
  return this.find(query, options.projection)
    .sort(options.sort || { callTimestamp: -1 })
    .limit(options.limit || 1000)
    .lean(options.lean !== false);
};

CallRecordSchema.statics.getDispositionCounts = function (match = {}) {
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$qc.disposition",
        count: { $sum: 1 },
        totalDuration: { $sum: "$durationSec" },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

module.exports = mongoose.model("CallRecord", CallRecordSchema);
