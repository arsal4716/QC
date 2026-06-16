const slugify = require("slugify");
const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");
const CallRecord = require("../models/CallRecord");
const { transcribe } = require("./deepgramService");
const { labelSpeakers, analyzeDisposition } = require("./openaiService");
const Campaign = require("../models/Campaign");
const Publisher = require("../models/Publisher");
const Buyer = require("../models/Buyer");
const Target = require("../models/Target");
const axios = require("axios");
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

class WebhookService {
  constructor() {
    this.redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        console.warn(`Redis reconnect attempt #${times}`);
        return Math.min(times * 2000, 15000);
      },
    });

    this.processingQueue = new Queue("call-processing", {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });

    this.worker = new Worker(
      "call-processing",
      this.processJob.bind(this),
      {
        connection: this.redisConnection,
        concurrency: 10,
        limiter: { max: 30, duration: 1000 },
      }
    );

    this.setupEventListeners();
  }

  async setupEventListeners() {
    this.worker.on("completed", (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });
    this.worker.on("failed", (job, err) => {
      console.error(`Job ${job.id} failed with error: ${err.message}`);
    });
    this.worker.on("error", (err) => {
      console.error("Worker error:", err);
    });
  }

  async addToProcessingQueue(payload) {
    try {
      const callData = this.transformPayload(payload);
      await this.ensureCampaignPublisher(callData);

      const callRecord = await CallRecord.create({
        ...callData,
        callStatus: "queued",
      });

      const jobId = callRecord._id.toString();

      const job = await this.processingQueue.add(
        "process-call",
        { payload, callRecordId: callRecord._id.toString() },
        { jobId, priority: 1 }
      );

      return job;
    } catch (error) {
      console.error("Error adding to processing queue:", error);
      throw error;
    }
  }

async processJob(job) {
  const { payload, callRecordId } = job.data;

  try {
    const callData = this.transformPayload(payload);

    await CallRecord.findByIdAndUpdate(callRecordId, {
      callStatus: "processing",
      processingStartTime: new Date(),
    });

    // ── Step 1: Transcribe ─────────────────────────────
    await CallRecord.findByIdAndUpdate(callRecordId, {
      callStatus: "transcribing",
    });

    let audioUrl = callData.recordingUrl;

    if (!audioUrl || typeof audioUrl !== "string") {
      throw new Error("Missing recording URL");
    }

    audioUrl = audioUrl.trim();

    // ── CallGrid handling ─────────────────────────────
    if (audioUrl.includes("api.callgrid.com/api/recordings")) {
      try {
        const meta = await axios.get(audioUrl, {
          headers: {
            Authorization: `Bearer ${process.env.CALLGRID_TOKEN}`,
          },
          timeout: 15000,
          maxRedirects: 5,
          validateStatus: () => true,
        });

        const resolvedUrl = meta.data?.url;

        if (
          meta.status === 200 &&
          typeof resolvedUrl === "string" &&
          resolvedUrl.startsWith("http")
        ) {
          audioUrl = resolvedUrl;
        } else {
          console.warn("CallGrid resolution failed, using original URL", {
            status: meta.status,
            data: meta.data,
            audioUrl,
          });
        }
      } catch (err) {
        console.warn("CallGrid fetch error, using original URL:", err.message);
      }
    }

    // ── IMPORTANT SAFETY CHECK ─────────────────────────
    if (!audioUrl.startsWith("http")) {
      throw new Error(`Invalid audio URL after resolution: ${audioUrl}`);
    }

    const {
      transcript,
      durationSec,
      estCost,
      detectedLanguage,
      languageConfidence,
    } = await transcribe(audioUrl);

    // ── Step 2: Label Speakers ─────────────────────────
    await CallRecord.findByIdAndUpdate(callRecordId, {
      callStatus: "labeling_speakers",
      transcript,
      detectedLanguage,
      languageConfidence,
      cost: estCost || 0,
    });

    const labeledTranscript = await labelSpeakers(transcript);

    // ── Step 3: Analyze Disposition ─────────────────────
    await CallRecord.findByIdAndUpdate(callRecordId, {
      callStatus: "analyzing_disposition",
      labeledTranscript,
    });

    const qc = await analyzeDisposition(
      labeledTranscript,
      callData.campaignName,
      detectedLanguage
    );

    // ── Step 4: Complete ───────────────────────────────
    await CallRecord.findByIdAndUpdate(callRecordId, {
      callStatus: "completed",
      status: qc.disposition,
      qc,
      processingEndTime: new Date(),
    });

    return { success: true };
  } catch (error) {
    const errorStatus = this.getErrorStatus(error);

    await CallRecord.findByIdAndUpdate(callRecordId, {
      callStatus: errorStatus,
      error: error.message,
      processingEndTime: new Date(),
    });

    throw error;
  }
}

  getErrorStatus(error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("transcription")) return "transcription_failed";
    if (msg.includes("speaker") || msg.includes("label")) return "labeling_failed";
    if (msg.includes("disposition") || msg.includes("analysis")) return "analysis_failed";
    return "failed";
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
      ringbaRaw: payload,
    };
  }

  async ensureCampaignPublisher(callData) {
    const cache = this.redisConnection;

    if (callData.campaignName) {
      const cacheKey = `campaign:${callData.campaignName}`;
      const seen = await cache.sismember("seenCampaigns", cacheKey);
      if (!seen) {
        const slug = this.generateSlug(callData.campaignName);
        await Campaign.updateOne(
          { name: callData.campaignName },
          { $setOnInsert: { name: callData.campaignName, slug } },
          { upsert: true }
        );
        await cache.sadd("seenCampaigns", cacheKey);
      }
    }

    if (callData.publisherName) {
      const cacheKey = `publisher:${callData.publisherName}`;
      const seen = await cache.sismember("seenPublishers", cacheKey);
      if (!seen) {
        const slug = this.generateSlug(callData.publisherName);
        await Publisher.updateOne(
          { name: callData.publisherName },
          { $setOnInsert: { name: callData.publisherName, slug } },
          { upsert: true }
        );
        await cache.sadd("seenPublishers", cacheKey);
      }
    }

    if (callData.systemBuyerId) {
      const cacheKey = `buyer:${callData.systemBuyerId}`;
      const seen = await cache.sismember("seenBuyers", cacheKey);
      if (!seen) {
        const slug = this.generateSlug(callData.systemBuyerId);
        await Buyer.updateOne(
          { name: callData.systemBuyerId },
          { $setOnInsert: { name: callData.systemBuyerId, slug } },
          { upsert: true }
        );
        await cache.sadd("seenBuyers", cacheKey);
      }
    }

    if (callData.ringbaRaw?.target_name) {
      const cacheKey = `target:${callData.ringbaRaw.target_name}`;
      const seen = await cache.sismember("seenTargets", cacheKey);
      if (!seen) {
        const slug = this.generateSlug(callData.ringbaRaw.target_name);
        await Target.updateOne(
          { name: callData.ringbaRaw.target_name },
          { $setOnInsert: { name: callData.ringbaRaw.target_name, slug } },
          { upsert: true }
        );
        await cache.sadd("seenTargets", cacheKey);
      }
    }
  }

  generateSlug(text) {
    return slugify(text, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.processingQueue.getWaitingCount(),
      this.processingQueue.getActiveCount(),
      this.processingQueue.getCompletedCount(),
      this.processingQueue.getFailedCount(),
      this.processingQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async close() {
    await this.worker.close();
    await this.processingQueue.close();
    await this.redisConnection.quit();
  }
}

module.exports = new WebhookService();