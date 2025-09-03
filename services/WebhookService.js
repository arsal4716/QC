const slugify = require('slugify');
const CallRecord = require("../models/CallRecord");
const { transcribe } = require("./deepgramService");
const { labelSpeakers, analyzeDisposition } = require("./openaiService");
const Campaign = require("../models/Campaign");
const Publisher = require("../models/Publisher");
const queue = {
  jobs: [],
  processing: false,
  concurrency: process.env.QUEUE_CONCURRENCY || 2,
  add(job) {
    this.jobs.push(job);
    this.process();
  },
  async process() {
    if (this.processing || this.jobs.length === 0) return;
    
    this.processing = true;
    const concurrentJobs = Math.min(this.concurrency, this.jobs.length);
    
    const processingJobs = [];
    for (let i = 0; i < concurrentJobs; i++) {
      if (this.jobs.length > 0) {
        const job = this.jobs.shift();
        processingJobs.push(this.processJob(job));
      }
    }
    
    await Promise.allSettled(processingJobs);
    this.processing = false;
        if (this.jobs.length > 0) {
      setImmediate(() => this.process());
    }
  },
  async processJob(jobData) {
    try {
      const webhookService = new WebhookService();
      await webhookService.processCallBackground(jobData);
    } catch (error) {
      console.error('Queue job failed:', error);
            try {
        await CallRecord.findOneAndUpdate(
          { systemCallId: jobData.systemCallId },
          {
            status: "failed",
            error: error.message,
            processingEndTime: new Date()
          }
        );
        console.log(`Call ${jobData.systemCallId} marked as failed`);
      } catch (dbError) {
        console.error('Failed to update call record status:', dbError);
      }
    }
  }
};

class WebhookService {
  async processRingbaWebhook(payload) {
    try {
      const callData = this.transformPayload(payload);
      await this.ensureCampaignPublisher(callData);

      const initialRecord = await CallRecord.findOneAndUpdate(
        { systemCallId: callData.systemCallId },
        {
          ...callData,
          durationSec: parseFloat(callData.ringbaRaw.duration_seconds) || 0,
          $setOnInsert: {
            status: "processing",
            processingStartTime: new Date()
          },
          $set: {
            ringbaRaw: callData.ringbaRaw, 
            updatedAt: new Date()
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );
      if (initialRecord.status === "processed") {
        console.log(`Duplicate call received for already processed systemCallId: ${callData.systemCallId}`);
        return { 
          success: true, 
          message: "Duplicate call received - already processed",
          callId: initialRecord._id,
          status: "already_processed",
          systemCallId: callData.systemCallId
        };
      }
      if (initialRecord.status.includes("failed")) {
        await CallRecord.findOneAndUpdate(
          { systemCallId: callData.systemCallId },
          {
            status: "processing",
            error: null,
            processingStartTime: new Date(),
            processingEndTime: null,
            processingTime: 0
          }
        );
      }
      if (!initialRecord.status.includes("processing") && initialRecord.status !== "processed") {
        queue.add({
          callId: initialRecord._id.toString(),
          systemCallId: callData.systemCallId,
          recordingUrl: callData.recordingUrl,
          campaignName: callData.campaignName,
          callerId: callData.callerId,
          processingStartTime: new Date()
        });

        console.log(`Call ${callData.systemCallId} queued for processing. Queue size: ${queue.jobs.length}`);
      } else {
        console.log(`Call ${callData.systemCallId} is already being processed or completed`);
      }

      return { 
        success: true, 
        message: "Call received and handled",
        callId: initialRecord._id,
        systemCallId: callData.systemCallId,
        status: initialRecord.status,
        queueSize: queue.jobs.length
      };

    } catch (error) {
      console.error("Webhook processing error:", error);
      
      return { 
        success: true, 
        message: "Call received but processing may be delayed",
        error: error.message 
      };
    }
  }

  transformPayload(payload) {
    return {
      systemCallId: payload.system_call_id,
      systemPublisherId: payload.system_publisher_id,
      target_name: payload.system_publisher_id,
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
  async processCallBackground(jobData) {
    const { callId, systemCallId, recordingUrl, campaignName, callerId, processingStartTime } = jobData;
    
    try {
            await CallRecord.findOneAndUpdate(
        { systemCallId },
        {
          status: "transcribing",
          processingStartTime: processingStartTime || new Date()
        }
      );
      let transcription;
      try {
        transcription = await transcribe(recordingUrl);
      } catch (transcribeError) {
        console.error(`Transcription failed for call ${systemCallId}:`, transcribeError);
        await CallRecord.findOneAndUpdate(
          { systemCallId },
          {
            status: "transcription_failed",
            error: `Transcription failed: ${transcribeError.message}`,
            processingEndTime: new Date()
          }
        );
        throw transcribeError;
      }

      await CallRecord.findOneAndUpdate(
        { systemCallId },
        {
          status: "labeling_speakers",
          transcript: transcription.transcript,
          durationSec: transcription.durationSec,
          cost: transcription.estCost || 0
        }
      );

      let labeledTranscript;
      try {
        labeledTranscript = await labelSpeakers(transcription.transcript);
      } catch (labelingError) {
        console.error(`Speaker labeling failed for call ${systemCallId}:`, labelingError);
        await CallRecord.findOneAndUpdate(
          { systemCallId },
          {
            status: "labeling_failed",
            error: `Speaker labeling failed: ${labelingError.message}`,
            processingEndTime: new Date()
          }
        );
        throw labelingError;
      }

      await CallRecord.findOneAndUpdate(
        { systemCallId },
        {
          status: "analyzing_disposition",
          labeledTranscript
        }
      );

      let qc;
      try {
        qc = await analyzeDisposition(labeledTranscript, campaignName);
      } catch (analysisError) {
        console.error(`Disposition analysis failed for call ${systemCallId}:`, analysisError);
        await CallRecord.findOneAndUpdate(
          { systemCallId },
          {
            status: "analysis_failed",
            error: `Disposition analysis failed: ${analysisError.message}`,
            processingEndTime: new Date()
          }
        );
        throw analysisError;
      }
      const processingTime = Math.round((new Date() - (processingStartTime || new Date())) / 1000);
      const updatedRecord = await CallRecord.findOneAndUpdate(
        { systemCallId },
        {
          qc,
          status: "processed",
          processingEndTime: new Date(),
          processingTime: processingTime
        },
        { new: true }
      );

      console.log(`Successfully processed call ${systemCallId} (${callerId}) in ${processingTime}s`);
      return updatedRecord;

    } catch (error) {
      console.error(`Error processing call ${systemCallId}:`, error);
            try {
        const existingRecord = await CallRecord.findOne({ systemCallId });
        if (existingRecord && 
            existingRecord.status !== "failed" && 
            !existingRecord.status.includes("_failed")) {
          await CallRecord.findOneAndUpdate(
            { systemCallId },
            {
              status: "failed",
              error: error.message,
              processingEndTime: new Date()
            }
          );
        }
      } catch (dbError) {
        console.error('Failed to update call record status:', dbError);
      }

      throw error;
    }
  }
  async getQueueStats() {
    return {
      waiting: queue.jobs.length,
      active: queue.processing ? queue.concurrency : 0,
      concurrency: queue.concurrency,
      processing: queue.processing
    };
  }
  async getProcessingStatus(systemCallId) {
    return await CallRecord.findOne({ systemCallId })
      .select('status processingStartTime processingEndTime processingTime error systemCallId callerId campaignName')
      .lean();
  }

  async getFailedCalls() {
    return await CallRecord.find({
      status: { $in: ["failed", "transcription_failed", "labeling_failed", "analysis_failed"] }
    }).select('systemCallId callerId status error createdAt campaignName').lean();
  }
  async retryCall(systemCallId) {
    const call = await CallRecord.findOne({ systemCallId });
    if (!call) {
      throw new Error('Call not found');
    }

    if (!call.recordingUrl) {
      throw new Error('No recording URL available for retry');
    }

    // Reset status and add to queue
    await CallRecord.findOneAndUpdate(
      { systemCallId },
      {
        status: "processing",
        error: null,
        processingStartTime: new Date(),
        processingEndTime: null,
        processingTime: 0
      }
    );

    queue.add({
      callId: call._id.toString(),
      systemCallId: call.systemCallId,
      recordingUrl: call.recordingUrl,
      campaignName: call.campaignName,
      callerId: call.callerId,
      processingStartTime: new Date()
    });

    return { success: true, message: "Call queued for retry", systemCallId };
  }

  // Check for duplicate calls
  async checkForDuplicate(systemCallId) {
    const count = await CallRecord.countDocuments({ systemCallId });
    return count > 0;
  }
}

module.exports = new WebhookService();