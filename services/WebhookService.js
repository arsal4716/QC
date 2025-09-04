const slugify = require('slugify');
const CallRecord = require("../models/CallRecord");
const { transcribe } = require("./deepgramService");
const { labelSpeakers, analyzeDisposition } = require("./openaiService");
const Campaign = require("../models/Campaign");
const Publisher = require("../models/Publisher");

class WebhookService {
  async processRingbaWebhook(payload) {
    try {
      const callData = this.transformPayload(payload);
      await this.ensureCampaignPublisher(callData);

      const result = await this.processCall(callData);
      return { success: true, data: result };
    } catch (error) {
      console.error("Webhook processing error:", error);
      throw error;
    }
  }

  transformPayload(payload) {
    return {
      systemCallId: payload.system_call_id,
      systemPublisherId: payload.system_publisher_id,
      systemBuyerId: payload.system_buyer_id,
      systemName: payload.system_name,
      callTimestamp: payload.call_timestamp,
      campaignName: payload.campaign_name,
      publisherName: payload.system_publisher_id, 
      callerId: payload.caller_number,
      inboundPhoneNumber: payload.inbound_phone_number,
      dialedNumber: payload.dialed_number,
      recordingUrl: payload.recording_url,
      ringbaRaw: payload
    };
  }

  async ensureCampaignPublisher(callData) {
    if (callData.campaignName) {
      const campaignSlug = this.generateSlug(callData.campaignName);
      await Campaign.updateOne(
        { name: callData.campaignName },
        { 
          $setOnInsert: { 
            name: callData.campaignName,
            slug: campaignSlug
          } 
        },
        { upsert: true }
      );
    }

    if (callData.publisherName) {
      const publisherSlug = this.generateSlug(callData.publisherName);
      await Publisher.updateOne(
        { name: callData.publisherName },
        { 
          $setOnInsert: { 
            name: callData.publisherName,
            slug: publisherSlug
          } 
        },
        { upsert: true }
      );
    }
  }

  generateSlug(text) {
    return slugify(text, {
      lower: true,     
      strict: true,     
      remove: /[*+~.()'"!:@]/g 
    });
  }

  async processCall(callData) {
    const transcription = await transcribe(callData.recordingUrl);
    const labeledTranscript = await labelSpeakers(transcription.transcript);
    const qc = await analyzeDisposition(labeledTranscript, callData.campaignName);

    return await CallRecord.create({
      ...callData,
      durationSec: transcription.durationSec,
      cost: transcription.estCost || 0,
      transcript: transcription.transcript,
      labeledTranscript,
      qc,
      status: "processed"
    });
  }
}

module.exports = new WebhookService();