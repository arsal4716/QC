const mongoose = require('mongoose');

const TwilioCallsSchema = new mongoose.Schema(
  {
    callSid: { type: String,index: true },

    from: { type: String, index: true },
    to: String,

    campaign: { type: String, index: true }, 
    callCenter: { type: String, index: true },

    status: String,
    direction: String,

    duration: Number,
    answered: { type: Boolean, default: false },

    recordingUrl: String,
    recordingDuration: Number,

    rawPayload: { type: Object }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TwilioCalls', TwilioCallsSchema);
