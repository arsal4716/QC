require("dotenv").config();
const CallRecord = require("../models/CallRecord");
const { analyzeDisposition } = require("../services/openaiService");

async function backfillIncome() {

  const cursor = CallRecord.find({
    labeledTranscript: { $exists: true, $ne: "" },
    callStatus: "completed",
    $or: [
      { "qc.income": { $exists: false } },
      { "qc.income": null }
    ]
  }).cursor();

  let processed = 0;

  for await (const record of cursor) {
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
      if (processed % 20 === 0) {
        console.log(`Processed ${processed}`);
        await new Promise(r => setTimeout(r, 1000)); 
      }
    } catch (err) {
      console.error(`Failed for ${record._id}`, err.message);
    }
  }

  console.log("Income backfill completed");
  process.exit(0);
}

backfillIncome();
