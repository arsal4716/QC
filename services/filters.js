const Campaign = require("../models/Campaign");
const Publisher = require("../models/Publisher");
const Buyer = require("../models/Buyer");
const Target = require("../models/Target");
const logger = require("../utils/logger");

class FiltersService {
  constructor() {
    this.maxLimit = 5000;
  }

  /**
   * Generic lookup query for Campaign/Publisher models
   * @param {Model} Model - Mongoose model (Campaign|Publisher)
   * @param {Object} opts - { search, page, limit, all }
   * @returns {Promise<{items: Array, meta: Object}>}
   */
  async listLookup(
    Model,
    { search = "", page = 1, limit = 1000, all = false } = {},
  ) {
    try {
      const query = search
        ? {
            name: { $regex: search.trim(), $options: "i" },
          }
        : {};

      const projection = { name: 1, slug: 1, _id: 0 };
      const sort = { name: 1 };

      if (all) {
        const items = await Model.find(query, projection)
          .sort(sort)
          .limit(this.maxLimit)
          .lean();

        return {
          items,
          meta: {
            page: 1,
            limit: items.length,
            total: items.length,
            pages: 1,
          },
        };
      }

      const validatedPage = Math.max(1, parseInt(page));
      const validatedLimit = Math.min(
        Math.max(1, parseInt(limit)),
        this.maxLimit,
      );
      const skip = (validatedPage - 1) * validatedLimit;

      const [items, total] = await Promise.all([
        Model.find(query, projection)
          .sort(sort)
          .skip(skip)
          .limit(validatedLimit)
          .lean(),
        Model.countDocuments(query),
      ]);

      return {
        items,
        meta: {
          page: validatedPage,
          limit: validatedLimit,
          total,
          pages: Math.max(1, Math.ceil(total / validatedLimit)),
        },
      };
    } catch (error) {
      logger.error("Lookup query failed", {
        error: error.message,
        model: Model.modelName,
        search,
        page,
        limit,
      });
      throw new Error(
        `Failed to load ${Model.modelName.toLowerCase()} data: ${error.message}`,
      );
    }
  }

  /**
   * Get campaigns for dropdown
   */
  async listCampaigns(opts = {}) {
    return this.listLookup(Campaign, opts);
  }

  /**
   * Get publishers for dropdown
   */
  async listPublishers(opts = {}) {
    return this.listLookup(Publisher, opts);
  }
  async listBuyers(opts = {}) {
    return this.listLookup(Buyer, opts);
  }

  /**
   * Get targets for dropdown
   */
  async listTargets(opts = {}) {
    return this.listLookup(Target, opts);
  }
  async findOrCreateCampaign(name) {
    try {
      if (!name) return null;

      const slug = this._generateSlug(name);
      let campaign = await Campaign.findOne({
        $or: [{ name }, { slug }],
      });

      if (!campaign) {
        campaign = new Campaign({
          name: name.trim(),
          slug,
        });
        await campaign.save();
        logger.info("New campaign created", { name, slug });
      }

      return campaign;
    } catch (error) {
      logger.error("Failed to find or create campaign", {
        error: error.message,
        name,
      });
      throw new Error(`Failed to process campaign: ${error.message}`);
    }
  }

  async findOrCreatePublisher(name) {
    try {
      if (!name) return null;

      const slug = this._generateSlug(name);
      let publisher = await Publisher.findOne({
        $or: [{ name }, { slug }],
      });

      if (!publisher) {
        publisher = new Publisher({
          name: name.trim(),
          slug,
        });
        await publisher.save();
        logger.info("New publisher created", { name, slug });
      }

      return publisher;
    } catch (error) {
      logger.error("Failed to find or create publisher", {
        error: error.message,
        name,
      });
      throw new Error(`Failed to process publisher: ${error.message}`);
    }
  }
  async findOrCreateBuyer(name) {
    try {
      if (!name) return null;

      const slug = this._generateSlug(name);
      let buyer = await Buyer.findOne({
        $or: [{ name }, { slug }],
      });

      if (!buyer) {
        buyer = new Buyer({
          name: name.trim(),
          slug,
        });
        await buyer.save();
        logger.info("New buyer created", { name, slug });
      }

      return buyer;
    } catch (error) {
      logger.error("Failed to find or create buyer", {
        error: error.message,
        name,
      });
      throw new Error(`Failed to process buyer: ${error.message}`);
    }
  }

  async findOrCreateTarget(name) {
    try {
      if (!name) return null;

      const slug = this._generateSlug(name);
      let target = await Target.findOne({
        $or: [{ name }, { slug }],
      });

      if (!target) {
        target = new Target({
          name: name.trim(),
          slug,
        });
        await target.save();
        logger.info("New target created", { name, slug });
      }

      return target;
    } catch (error) {
      logger.error("Failed to find or create target", {
        error: error.message,
        name,
      });
      throw new Error(`Failed to process target: ${error.message}`);
    }
  }

  async listAllFilters(opts = {}) {
    try {
      const [campaigns, publishers, buyers, targets] = await Promise.all([
        this.listCampaigns(opts),
        this.listPublishers(opts),
        this.listBuyers(opts),
        this.listTargets(opts),
      ]);

      return {
        campaigns: campaigns.items,
        publishers: publishers.items,
        buyers: buyers.items,
        targets: targets.items,
        meta: {
          campaigns: campaigns.meta,
          publishers: publishers.meta,
          buyers: buyers.meta,
          targets: targets.meta,
          total:
            campaigns.meta.total +
            publishers.meta.total +
            buyers.meta.total +
            targets.meta.total,
        },
      };
    } catch (error) {
      logger.error("Failed to get all filters", { error: error.message });
      throw new Error(`Failed to load filters: ${error.message}`);
    }
  }

  /**
   * Cleanup unused entries (optional cron job)
   */
  async cleanupOldEntries(days = 90) {
    try {
      logger.info("Cleanup not needed for simple filter models");
      return { cleaned: 0 };
    } catch (error) {
      logger.error("Cleanup failed", { error: error.message });
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }
  _generateSlug(name) {
    const slugify = require("slugify");
    return slugify(name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
}
module.exports = new FiltersService();
