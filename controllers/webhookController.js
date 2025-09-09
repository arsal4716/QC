const webhookService = require("../services/WebhookService");
const { success, error } = require("../utils/apiResponse");

exports.receiveWebhook = async (req, res) => {
  try {
    const rawPayload = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
    const payload = {};
    
    for (let key in rawPayload) {
      payload[key.trim()] = rawPayload[key];
    }

    if (!payload.recording_url || !payload.system_call_id) {
      return error(res, { 
        status: 400, 
        message: "Missing required fields: recording_url and system_call_id" 
      });
    }
    webhookService.addToProcessingQueue(payload).catch(err => {
      console.error('Error queuing webhook:', err);
    });

    return success(res, { 
      message: "Webhook received and queued for processing",
      status: "queued"
    });

  } catch (err) {
    console.error('Webhook processing error:', err);
    return error(res, { 
      status: 500, 
      message: "Failed to process webhook" 
    });
  }
};

exports.getQueueStats = async (req, res) => {
  try {
    const stats = await webhookService.getQueueStats();
    return success(res, stats);
  } catch (error) {
    return error(res, { status: 500, message: error.message });
  }
};