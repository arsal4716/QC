require("dotenv").config();
const connectDB = require("../config/db");
const CallRecord = require("../models/CallRecord");
const { analyzeDisposition } = require("../services/openaiService");

async function backfillIncome() {
  await connectDB(); 
  console.log("MongoDB connected");

  const cursor = CallRecord.find({
    labeledTranscript: { $exists: true, $ne: "" },
    callStatus: "completed",
    $or: [
      { "qc.income": { $exists: false } },
      { "qc.income": null },
    ],
  }).cursor();

  let processed = 0;

  for await (const record of cursor) {
    console.log("Scanning:", record._id);

    try {
      const qc = await analyzeDisposition(
        record.labeledTranscript,
        record.campaignName
      );

      if (!qc?.income) continue;

      await CallRecord.updateOne(
        { _id: record._id },
        { $set: { "qc.income": qc.income } }
      );

      processed++;
      console.log("Updated:", record._id);
    } catch (err) {
      console.error("Failed:", record._id, err.message);
    }
  }

  console.log("Income backfill completed:", processed);
  process.exit(0);
}

backfillIncome();
