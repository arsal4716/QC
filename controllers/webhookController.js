const webhookService = require("../services/WebhookService");
const { success, error } = require("../utils/apiResponse");

exports.receiveWebhook = async (req, res) => {
  try {
    const rawPayload = (req.body && Object.keys(req.body).length > 0) 
      ? req.body 
      : req.query;
    const payload = {};
    for (let key in rawPayload) {
      const cleanKey = key.trim();
      payload[cleanKey] = rawPayload[key];
    }

    console.log("Webhook hit with payload:", payload);

    if (!payload.recording_url || !payload.system_call_id) {
      return error(res, { 
        status: 400, 
        message: "Missing required fields: recording_url and system_call_id are required" 
      });
    }

    const result = await webhookService.processRingbaWebhook(payload);
    return success(res, result);
  } catch (err) {
    console.error("Webhook Error:", err);
    return error(res, { 
      status: 500, 
      message: "Failed to process webhook" 
    });
  }
};
