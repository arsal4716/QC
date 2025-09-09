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
    target_name: { type: String, trim: true, index: true },
    systemName: { type: String, trim: true, index: true },
    callTimestamp: { type: Date, index: true },
    campaignName: { type: String, trim: true, index: true },
    publisherName: { type: String, trim: true, index: true },
    callerId: { type: String, trim: true, index: true },
    inboundPhoneNumber: { type: String, trim: true },
    dialedNumber: { type: String, trim: true },
    cost: Number,
    recordingUrl: { type: String, trim: true },
    transcript: { type: String, trim: true },
    labeledTranscript: { type: String, trim: true },
    qc: QCSchema,
    ringbaRaw: Object,
    
    // Customer disposition status (from QC analysis)
    status: {
      type: String,
      trim: true,
      index: true
    },
    
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
        "analysis_failed"
      ],
      default: "queued",
      index: true,
      trim: true
    },
    
    error: { 
      type: String, 
      trim: true 
    },
    processingStartTime: { 
      type: Date 
    },
    processingEndTime: { 
      type: Date 
    },
    processingTime: { 
      type: Number,
      default: 0 
    }
  },
  { timestamps: true }
);

CallRecordSchema.index({
  transcript: "text",
  "qc.summary": "text",
  "qc.reason": "text"
});

CallRecordSchema.virtual('calculatedProcessingTime').get(function() {
  if (this.processingStartTime && this.processingEndTime) {
    return Math.round((this.processingEndTime - this.processingStartTime) / 1000);
  }
  return 0;
});

CallRecordSchema.methods.markAsFailed = function(errorMessage, callStatus = "failed") {
  this.callStatus = callStatus;
  this.error = errorMessage;
  this.processingEndTime = new Date();
  this.processingTime = this.calculatedProcessingTime;
  return this.save();
};

CallRecordSchema.statics.findFailedCalls = function() {
  return this.find({
    callStatus: { $in: ["failed", "transcription_failed", "labeling_failed", "analysis_failed"] }
  });
};

CallRecordSchema.statics.findProcessingCalls = function() {
  return this.find({
    callStatus: { $in: ["processing", "transcribing", "labeling_speakers", "analyzing_disposition"] }
  });
};

module.exports = mongoose.model("CallRecord", CallRecordSchema);