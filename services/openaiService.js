const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SPEAKER_PROMPT = fs.readFileSync(
  path.join(__dirname, "../prompts/speaker_label_prompt.txt"),
  "utf8",
);
const QC_PROMPT = fs.readFileSync(
  path.join(__dirname, "../prompts/qc_prompt.txt"),
  "utf8",
);

async function labelSpeakers(rawTranscript) {
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: SPEAKER_PROMPT },
      { role: "user", content: rawTranscript || "" },
    ],
  });
  return r.choices?.[0]?.message?.content?.trim() || rawTranscript || "";
}

async function analyzeDisposition(labeledTranscript, campaignName) {
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: QC_PROMPT },
      {
        role: "user",
        content: `This Call is from Campaign: "${campaignName}". Transcript:\n${labeledTranscript}`,
      },
    ],
  });

  const content = (r.choices?.[0]?.message?.content || "")
    .replace(/```json|```/g, "")
    .trim();
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }
  return {
    disposition: parsed.disposition || "Not Classified",
    sub_disposition: parsed.sub_disposition || null,
    reason: parsed.reason || "",
    summary: parsed.summary || "",
    sentiment: parsed.sentiment || "Neutral",
    confidence_level: parsed.confidence_level || "Low",
    key_moments: parsed.key_moments || [],
    objections_raised: parsed.objections_raised || [],
    objections_overcome: parsed.objections_overcome || "No",
  };
}

module.exports = { labelSpeakers, analyzeDisposition };
