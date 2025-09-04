const slugify = require('slugify');
const CallRecord = require("../models/CallRecord");
const { transcribe } = require("./deepgramService");
const { labelSpeakers, analyzeDisposition } = require("./openaiService");
const Campaign = require("../models/Campaign");
const Publisher = require("../models/Publisher");

class WebhookService {
  constructor() {
    this.processingQueue = [];
    this.isProcessing = false;
    this.maxConcurrent = 2;
    this.currentProcesses = 0;
    this.retryAttempts = new Map(); 
        this.processQueue();
  }

  async addToProcessingQueue(payload) {
    const queueItem = {
      payload,
      attempts: 0,
      maxAttempts: 3,
      nextRetry: Date.now(),
      addedAt: new Date()
    };
    
    this.processingQueue.push(queueItem);
    console.log(`Added to queue. Queue size: ${this.processingQueue.length}`);
    
    // Ensure queue processing is running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // Process the queue
  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    const processNext = async () => {
      // Check if we can process more items
      if (this.currentProcesses >= this.maxConcurrent || this.processingQueue.length === 0) {
        if (this.processingQueue.length === 0) {
          this.isProcessing = false;
        }
        setTimeout(processNext, 1000); // Check again in 1 second
        return;
      }
      
      // Find the next item to process (prioritize items that are ready for retry)
      const now = Date.now();
      const nextIndex = this.processingQueue.findIndex(item => item.nextRetry <= now);
      
      if (nextIndex === -1) {
        setTimeout(processNext, 1000); // Check again in 1 second
        return;
      }
      
      // Get the next item
      const queueItem = this.processingQueue.splice(nextIndex, 1)[0];
      this.currentProcesses++;
      
      try {
        console.log(`Processing call ${queueItem.payload.system_call_id}, Attempt: ${queueItem.attempts + 1}`);
        await this.processRingbaWebhook(queueItem.payload);
        console.log(`Successfully processed call ${queueItem.payload.system_call_id}`);
        this.currentProcesses--;
      } catch (error) {
        console.error(`Error processing call ${queueItem.payload.system_call_id}:`, error.message);
        this.currentProcesses--;
        
        // Check if we should retry
        if (queueItem.attempts < queueItem.maxAttempts - 1) {
          queueItem.attempts++;
          queueItem.nextRetry = Date.now() + (Math.pow(2, queueItem.attempts) * 5000); // Exponential backoff
          this.processingQueue.push(queueItem);
          console.log(`Scheduled retry ${queueItem.attempts} for call ${queueItem.payload.system_call_id}`);
        } else {
          console.error(`Max retries exceeded for call ${queueItem.payload.system_call_id}`);
          // You might want to save failed attempts to a separate log or database
        }
      }
      
      // Process next item
      setTimeout(processNext, 100);
    };
    
    processNext();
  }

  async processRingbaWebhook(payload) {
    const callData = this.transformPayload(payload);
    await this.ensureCampaignPublisher(callData);

    const result = await this.processCall(callData);
    return { success: true, data: result };
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

// Export singleton instance
module.exports = new WebhookService();