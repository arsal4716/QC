// server/services/filters.service.js
const Campaign = require("../models/Campaign");
const Publisher = require("../models/Publisher");

class FiltersService {
  /**
   * Generic paged query over a lookup collection
   * @param {Model} Model - Mongoose model (Campaign|Publisher)
   * @param {Object} opts - { search, page, limit, all }
   * @returns {Promise<{items: Array, meta: {page, limit, total, pages}}>}
   */
  async listLookup(Model, { search = "", page = 1, limit = 1000, all = false } = {}) {
    const q = search ? { name: { $regex: search.trim(), $options: "i" } } : {};
    const projection = { _id: 0, name: 1, slug: 1 }; 

    if (all) {
      const items = await Model.find(q, projection).sort({ name: 1 }).lean();
      return {
        items,
        meta: { page: 1, limit: items.length, total: items.length, pages: 1 }
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Model.find(q, projection).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
      Model.countDocuments(q),
    ]);

    return {
      items,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.max(1, Math.ceil(total / Number(limit))),
      },
    };
  }

  listCampaigns(opts) {
    return this.listLookup(Campaign, opts);
  }

  listPublishers(opts) {
    return this.listLookup(Publisher, opts);
  }
}

module.exports = new FiltersService();
