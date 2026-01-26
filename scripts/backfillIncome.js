require("dotenv").config();
const connectDB = require("../config/db");
const CallRecord = require("../models/CallRecord");

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
  })
    .select({ _id: 1, "qc.income": 1, transcript: 1 }) 
    .lean()
    .cursor({ batchSize: 500 });

  let processed = 0;

  for await (const record of cursor) {
    console.log("Scanning:", record._id);

    try {

      const income = record.qc?.income || extractIncomeFromTranscript(record.transcript);

      if (!income) continue;

      await CallRecord.updateOne(
        { _id: record._id },
        { $set: { "qc.income": income } }
      );

      processed++;
      console.log("Income added:", record._id, "Income:", income);
    } catch (err) {
      console.error("Failed:", record._id, err.message);
    }
  }

  console.log("Income backfill completed. Total updated:", processed);
  process.exit(0);
}

function extractIncomeFromTranscript(transcript) {
  if (!transcript) return null;
  const match = transcript.match(/\$?(\d{2,6})/);
  return match ? match[1] : null;
}

backfillIncome();
