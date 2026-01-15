import { getNextCallCenter, logIncomingCall, attachRecording } from '../controllers/twilioCallsController';
import twilio from 'twilio';

export const inboundCall = async (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  const center = getNextCallCenter();

  await logIncomingCall(req.body, center);

  response.dial({
    record: 'record-from-answer',
    recordingStatusCallback: '/webhooks/twilio/recording',
    recordingStatusCallbackMethod: 'POST'
  }, center.number);

  res.type('text/xml');
  res.send(response.toString());
};

export const recordingCallback = async (req, res) => {
  await attachRecording(req.body.CallSid, req.body);
  res.sendStatus(200);
};
