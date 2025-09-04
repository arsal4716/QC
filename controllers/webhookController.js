const webhookService = require("../services/WebhookService");
const { success, error } = require("../utils/apiResponse");

exports.receiveWebhook = async (req, res) => {
  try {
    const rawPayload = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
    const payload = {};
    for (let key in rawPayload) {
      payload[key.trim()] = rawPayload[key];
    }

    console.log("Webhook hit with payload:", payload);

    if (!payload.recording_url || !payload.system_call_id) {
      return error(res, { 
        status: 400, 
        message: "Missing required fields: recording_url and system_call_id" 
      });
    }
    res.status(200).json({ 
      success: true, 
      message: "Webhook received and queued for processing" 
    });
    webhookService.addToProcessingQueue(payload).catch(err => {
      console.error("Failed to queue processing:", err);
    });

  } catch (err) {
    console.error("Webhook Error:", err);
    return error(res, { 
      status: 500, 
      message: "Failed to process webhook" 
    });
  }
};