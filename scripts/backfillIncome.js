// scripts/backfillIncome.js
const mongoose = require("mongoose");
const CallRecord = require("../models/CallRecord");
const { extractIncome } = require("../services/incomeExtractor");

async function backfillIncome(batchSize = 50) {
  const cursor = CallRecord.find({
    transcript: { $exists: true, $ne: "" },
    callStatus: "completed",
    $or: [
      { "qc.income": { $exists: false } },
      { "qc.income.value": { $exists: false } },
    ],
  }).cursor();

  let processed = 0;

  for await (const record of cursor) {
    try {
      const income = await extractIncome(
        record.labeledTranscript || record.transcript
      );

      if (!income) continue;

      await CallRecord.updateOne(
        { _id: record._id },
        { $set: { "qc.income": income } }
      );

      processed++;
      if (processed % batchSize === 0) {
        console.log(`Processed ${processed}`);
        await new Promise((r) => setTimeout(r, 1000)); // rate limit
      }
    } catch (err) {
      console.error(`Failed for ${record._id}`, err.message);
    }
  }

  console.log("Backfill complete");
}

backfillIncome();
