const FiltersService = require("../services/filters");
const RecordsService = require("../services/recordsService");
const { success, error } = require("../utils/apiResponse");
const logger = require("../utils/logger");

class FiltersController {
  constructor() {
    this.filtersService = FiltersService;
    this.recordsService = RecordsService;

    this.listCampaigns = this.listCampaigns.bind(this);
    this.listPublishers = this.listPublishers.bind(this);
    this.listBuyers = this.listBuyers.bind(this);
    this.listTargets = this.listTargets.bind(this);
    this.listDispositions = this.listDispositions.bind(this);
    this.listAll = this.listAll.bind(this);
    this.getFilterMetadata = this.getFilterMetadata.bind(this);
  }

  _parseQuery(req) {
    const search = (req.query.search || "").trim();
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit || 1000, 10)),
      5000
    );
    const all = req.query.all === "1" || req.query.all === "true";

    return { search, page, limit, all };
  }

  async listCampaigns(req, res) {
    try {
      const startTime = process.hrtime();
      const opts = this._parseQuery(req);

      logger.debug("Fetching campaigns", { opts });
      const serviceResult = await this.filtersService.listCampaigns(opts);

      const result = serviceResult.items.map((item) => ({
        value: item.slug,
        label: item.name,
        count: null,
      }));

      const duration = process.hrtime(startTime);
      const durationMs = (duration[0] * 1000 + duration[1] / 1000000).toFixed(
        2
      );

      return success(res, {
        campaigns: result,
        meta: {
          count: result.length,
          ...serviceResult.meta,
          hasMore: serviceResult.meta.page < serviceResult.meta.pages,
          duration: `${durationMs}ms`,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Failed to load campaigns", {
        error: err.message,
        stack: err.stack,
        query: req.query,
      });
      return error(res, {
        status: 500,
        message: "Failed to load campaigns",
        code: "CAMPAIGNS_LOAD_FAILED",
      });
    }
  }

  async listPublishers(req, res) {
    try {
      const startTime = process.hrtime();
      const opts = this._parseQuery(req);

      logger.debug("Fetching publishers", { opts });
      const serviceResult = await this.filtersService.listPublishers(opts);

      const result = serviceResult.items.map((item) => ({
        value: item.slug,
        label: item.name,
        count: null,
      }));

      const duration = process.hrtime(startTime);
      const durationMs = (duration[0] * 1000 + duration[1] / 1000000).toFixed(
        2
      );

      return success(res, {
        publishers: result,
        meta: {
          count: result.length,
          ...serviceResult.meta,
          hasMore: serviceResult.meta.page < serviceResult.meta.pages,
          duration: `${durationMs}ms`,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Failed to load publishers", {
        error: err.message,
        stack: err.stack,
        query: req.query,
      });
      return error(res, {
        status: 500,
        message: "Failed to load publishers",
        code: "PUBLISHERS_LOAD_FAILED",
      });
    }
  }

  async listBuyers(req, res) {
    try {
      const opts = this._parseQuery(req);
      const serviceResult = await this.filtersService.listBuyers(opts);

      const result = serviceResult.items.map((item) => ({
        value: item.slug,
        label: item.name,
        count: null,
      }));

      return success(res, {
        buyers: result,
        meta: serviceResult.meta,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Failed to load buyers", {
        error: err.message,
        stack: err.stack,
        query: req.query,
      });
      return error(res, {
        status: 500,
        message: "Failed to load buyers",
        code: "BUYERS_LOAD_FAILED",
      });
    }
  }

  async listTargets(req, res) {
    try {
      const opts = this._parseQuery(req);
      const serviceResult = await this.filtersService.listTargets(opts);

      const result = serviceResult.items.map((item) => ({
        value: item.slug,
        label: item.name,
        count: null,
      }));

      return success(res, {
        targets: result,
        meta: serviceResult.meta,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Failed to load targets", {
        error: err.message,
        stack: err.stack,
        query: req.query,
      });
      return error(res, {
        status: 500,
        message: "Failed to load targets",
        code: "TARGETS_LOAD_FAILED",
      });
    }
  }

  async listDispositions(req, res) {
    try {
      const startTime = process.hrtime();
      const { datePreset, startDate, endDate, campaign, publisher } = req.query;
      const filters = { datePreset, startDate, endDate, campaign, publisher };

      logger.debug("Fetching dispositions", { filters });
      const dispositions = await this.recordsService.getFieldValues(
        "qc.disposition",
        filters
      );

      const duration = process.hrtime(startTime);
      const durationMs = (duration[0] * 1000 + duration[1] / 1000000).toFixed(
        2
      );

      return success(res, {
        dispositions,
        meta: { count: dispositions.length, duration: `${durationMs}ms` },
        filters,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Failed to load dispositions", {
        error: err.message,
        stack: err.stack,
        query: req.query,
      });
      return error(res, {
        status: 500,
        message: "Failed to load dispositions",
        code: "DISPOSITIONS_LOAD_FAILED",
      });
    }
  }

  async listAll(req, res) {
    try {
      const opts = this._parseQuery(req);
      const [
        campaignsResult,
        publishersResult,
        buyersResult,
        targetsResult,
        dispositions,
      ] = await Promise.all([
        this.filtersService.listCampaigns(opts),
        this.filtersService.listPublishers(opts),
        this.filtersService.listBuyers(opts),
        this.filtersService.listTargets(opts),
        this.recordsService.getFieldValues("qc.disposition", req.query),
      ]);

      return success(res, {
        campaigns: campaignsResult.items.map((i) => ({
          value: i.slug,
          label: i.name,
        })),
        publishers: publishersResult.items.map((i) => ({
          value: i.slug,
          label: i.name,
        })),
        buyers: buyersResult.items.map((i) => ({
          value: i.slug,
          label: i.name,
        })),
        targets: targetsResult.items.map((i) => ({
          value: i.slug,
          label: i.name,
        })),
        dispositions,
        meta: {
          campaigns: campaignsResult.meta,
          publishers: publishersResult.meta,
          buyers: buyersResult.meta,
          targets: targetsResult.meta,
          dispositionsCount: dispositions.length,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.error("Failed to load all filters", {
        error: err.message,
        stack: err.stack,
        query: req.query,
      });
      return error(res, {
        status: 500,
        message: "Failed to load filters",
        code: "FILTERS_LOAD_FAILED",
      });
    }
  }

  async getFilterMetadata(req, res) {
    try {
      const { datePreset, startDate, endDate } = req.query;
      const filters = { datePreset, startDate, endDate };

      logger.debug("Fetching filter metadata", { filters });

      const [campaigns, publishers, buyers, targets, dispositions] =
        await Promise.all([
          this.filtersService.listCampaigns({ all: true }),
          this.filtersService.listPublishers({ all: true }),
          this.filtersService.listBuyers({ all: true }),
          this.filtersService.listTargets({ all: true }),
          this.recordsService.getFieldValues("qc.disposition", filters),
        ]);

      return success(res, {
        metadata: {
          campaigns: { count: campaigns.items.length },
          publishers: { count: publishers.items.length },
          buyers: { count: buyers.items.length },
          targets: { count: targets.items.length },
          dispositions: { count: dispositions.length },
          totalOptions:
            campaigns.items.length +
            publishers.items.length +
            buyers.items.length +
            targets.items.length +
            dispositions.length,
        },
        filters,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Failed to load filter metadata", {
        error: err.message,
        stack: err.stack,
        query: req.query,
      });
      return error(res, {
        status: 500,
        message: "Failed to load filter metadata",
        code: "METADATA_LOAD_FAILED",
      });
    }
  }
}

module.exports = new FiltersController();
