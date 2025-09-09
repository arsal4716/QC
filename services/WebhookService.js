const slugify = require('slugify');
const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
const CallRecord = require("../models/CallRecord");
const { transcribe } = require("./deepgramService");
const { labelSpeakers, analyzeDisposition } = require("./openaiService");
const Campaign = require("../models/Campaign");
const Publisher = require("../models/Publisher");
const { ObjectId } = require('mongoose').Types;

class WebhookService {
  constructor() {
    // Redis connection for BullMQ
    this.redisConnection = new Redis(process.env.REDIS_URL || {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    // Create processing queue
    this.processingQueue = new Queue('call-processing', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: {
          age: 24 * 3600, // keep completed jobs for 24 hours
          count: 1000 // keep up to 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // keep failed jobs for 7 days
        }
      }
    });

    // Create worker to process jobs
    this.worker = new Worker('call-processing', this.processJob.bind(this), {
      connection: this.redisConnection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000
      }
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  async setupEventListeners() {
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed with error: ${err.message}`);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }


async addToProcessingQueue(payload) {
  try {
    const callData = this.transformPayload(payload);
    await this.ensureCampaignPublisher(callData);
    
    const callRecord = await CallRecord.create({
      ...callData,
      callStatus: "queued"
    });

    // Use MongoDB ObjectId as job ID
    const jobId = callRecord._id.toString();
    
    const job = await this.processingQueue.add(
      'process-call',
      { payload, callRecordId: callRecord._id.toString() },
      {
        jobId: jobId,
        priority: 1 
      }
    );

    console.log(`Job added to queue: ${job.id}`);
    return job;
  } catch (error) {
    console.error('Error adding to processing queue:', error);
    throw error;
  }
}

  async processJob(job) {
    const { payload, callRecordId } = job.data;
    
    try {
      const callData = this.transformPayload(payload);
      
      // Update call status to processing
      await CallRecord.findByIdAndUpdate(callRecordId, {
        callStatus: "processing",
        processingStartTime: new Date()
      });

      await CallRecord.findByIdAndUpdate(callRecordId, {
        callStatus: "transcribing"
      });
      
      const transcription = await transcribe(callData.recordingUrl);
      await CallRecord.findByIdAndUpdate(callRecordId, {
        callStatus: "labeling_speakers",
        transcript: transcription.transcript,
        cost: transcription.estCost || 0
      });
      const labeledTranscript = await labelSpeakers(transcription.transcript);
      await CallRecord.findByIdAndUpdate(callRecordId, {
        callStatus: "analyzing_disposition",
        labeledTranscript
      });

      const qc = await analyzeDisposition(labeledTranscript, callData.campaignName);
      
      await CallRecord.findByIdAndUpdate(callRecordId, {
        callStatus: "completed",
        status: qc.disposition, 
        qc,
        processingEndTime: new Date()
      });

      return { success: true };

    } catch (error) {
      // Update call record with error
      const errorStatus = this.getErrorStatus(error);
      await CallRecord.findByIdAndUpdate(callRecordId, {
        callStatus: errorStatus,
        error: error.message,
        processingEndTime: new Date()
      });
      
      throw error; // Let BullMQ handle retries
    }
  }

  getErrorStatus(error) {
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('transcription')) return 'transcription_failed';
    if (errorMessage.includes('speaker') || errorMessage.includes('label')) return 'labeling_failed';
    if (errorMessage.includes('disposition') || errorMessage.includes('analysis')) return 'analysis_failed';
    return 'failed';
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

  // Utility methods for monitoring
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.processingQueue.getWaitingCount(),
      this.processingQueue.getActiveCount(),
      this.processingQueue.getCompletedCount(),
      this.processingQueue.getFailedCount(),
      this.processingQueue.getDelayedCount()
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }

  async close() {
    await this.worker.close();
    await this.processingQueue.close();
    await this.redisConnection.quit();
  }
}

module.exports = new WebhookService();