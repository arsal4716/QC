const twilio = require('twilio');
const TwilioCalls = require('../models/TwilioCalls');

// Round-robin call centers
const CALL_CENTERS = [
  { name: 'CENTER_A', number: '+12135550001' },
  { name: 'CENTER_B', number: '+12135550002' },
  { name: 'CENTER_C', number: '+12135550003' }
];

let pointer = 0;
const getNextCallCenter = () => {
  const center = CALL_CENTERS[pointer];
  pointer = (pointer + 1) % CALL_CENTERS.length;
  return center;
};
exports.inboundCall = async (req, res) => {
  try {
    console.log('Incoming request body:', req.body);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    const center = getNextCallCenter();
    console.log('Assigning to call center:', center);

    if (!req.body.CallSid) {
      console.error('CallSid is missing in request!');
      return res.status(400).send('CallSid is required');
    }

    await TwilioCalls.create({
      callSid: req.body.CallSid,
      from: req.body.From,
      to: req.body.To,
      campaign: 'CTA',
      callCenter: center.name,
      status: req.body.CallStatus,
      direction: req.body.Direction,
      rawPayload: req.body
    });

    response.dial(
      {
        record: 'record-from-answer',
        recordingStatusCallback: `${process.env.BASE_URL}/api/twilioCalls/recording`,
        recordingStatusCallbackMethod: 'POST'
      },
      center.number
    );

    res.type('text/xml');
    res.send(response.toString());
  } catch (err) {
    console.error('Inbound Call Error:', err);
    res.sendStatus(500);
  }
};


exports.recordingCallback = async (req, res) => {
  try {
    await TwilioCalls.findOneAndUpdate(
      { callSid: req.body.CallSid },
      {
        recordingUrl: req.body.RecordingUrl,
        recordingDuration: req.body.RecordingDuration,
        duration: req.body.CallDuration,
        answered: true,
        status: 'completed'
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error('Recording Error:', err);
    res.sendStatus(500);
  }
};

exports.getCalls = async (req, res) => {
  const calls = await TwilioCalls.find()
    .sort({ createdAt: -1 })
    .limit(200);

  res.json(calls);
};
