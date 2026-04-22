const axios = require("axios");
const fs = require("fs");
const path = require("path");
const AAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const AAI_COST_PER_MIN = 0.006;
const AAI_BASE_URL = "https://api.assemblyai.com/v2";

async function transcribe(recordingUrl) {
  const tmp = path.join(__dirname, `../tmp_${Date.now()}.mp3`);
  const audioRes = await axios.get(recordingUrl, { responseType: "arraybuffer", timeout: 60_000 });
  fs.writeFileSync(tmp, audioRes.data);
  const audio = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  const uploadRes = await axios.post(`${AAI_BASE_URL}/upload`, audio, {
    headers: {
      authorization: AAI_API_KEY,
      "content-type": "application/octet-stream",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const audioUrl = uploadRes.data.upload_url;

  // 2. Start transcription
  const transRes = await axios.post(
    `${AAI_BASE_URL}/transcript`,
    { audio_url: audioUrl, speech_model: "universal" },
    { headers: { authorization: AAI_API_KEY } }
  );

  const transcriptId = transRes.data.id;

  // 3. Poll for completion
  let result;
  while (true) {
    const poll = await axios.get(`${AAI_BASE_URL}/transcript/${transcriptId}`, {
      headers: { authorization: AAI_API_KEY },
    });
    result = poll.data;

    if (result.status === "completed") break;
    if (result.status === "error") throw new Error(result.error);

    await new Promise(r => setTimeout(r, 3000));
  }

  const transcript = result?.text || "";
  const durationSec = Number(result?.audio_duration || 0);
  const estCost = (durationSec / 60) * AAI_COST_PER_MIN;

  return { transcript, durationSec, estCost };
}

module.exports = { transcribe };
