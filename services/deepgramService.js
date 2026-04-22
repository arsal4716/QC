const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@deepgram/sdk");

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const DG_COST_PER_MIN = 0.004;

async function transcribe(recordingUrl) {
  const tmp = path.join(__dirname, `../tmp_${Date.now()}.mp3`);

  const audioRes = await axios.get(recordingUrl, {
    responseType: "arraybuffer",
    timeout: 60_000,
  });
  fs.writeFileSync(tmp, audioRes.data);

  const audio = fs.readFileSync(tmp);

  const { result } = await deepgram.listen.prerecorded.transcribeFile(audio, {
    model: "nova-2",
    detect_language: true,
    smart_format: true,
    punctuate: true,
    diarize: true,
    diarize_version: "2",
    utterances: true,
    filler_words: true,
    multichannel: false,
  });

  fs.unlinkSync(tmp);

  const transcript =
    result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
  const durationSec = Number(result?.metadata?.duration || 0);
  const estCost = (durationSec / 60) * DG_COST_PER_MIN;
  const detectedLanguage =
    result?.results?.channels?.[0]?.detected_language || "en";
  const languageConfidence =
    result?.results?.channels?.[0]?.language_confidence || 0;

  return { transcript, durationSec, estCost, detectedLanguage, languageConfidence };
}

module.exports = { transcribe };