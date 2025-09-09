const FiltersService = require("../services/filters");
function parseQuery(req) {
  const search = (req.query.search || "").trim();
  const page = Math.max(1, parseInt(req.query.page ?? 1, 10));
  const limit = Math.min(Math.max(1, parseInt(req.query.limit ?? 1000, 10)), 5000);
  const all = req.query.all === "1" || req.query.all === "true";
  return { search, page, limit, all };
}

exports.listCampaigns = async (req, res) => {
  try {
    const opts = parseQuery(req);
    const { items, meta } = await FiltersService.listCampaigns(opts);
    res.json({ campaigns: items, meta });
  } catch (e) {
    res.status(500).json({ message: "Failed to load campaigns" });
  }
};

exports.listPublishers = async (req, res) => {
  try {
    const opts = parseQuery(req);
    const { items, meta } = await FiltersService.listPublishers(opts);
    res.json({ publishers: items, meta });
  } catch (e) {
    res.status(500).json({ message: "Failed to load publishers" });
  }
};

exports.listAll = async (req, res) => {
  try {
    const opts = parseQuery(req);
    const [c, p] = await Promise.all([
      FiltersService.listCampaigns(opts),
      FiltersService.listPublishers(opts),
    ]);
    res.json({ campaigns: c.items, publishers: p.items, meta: { campaigns: c.meta, publishers: p.meta } });
  } catch (e) {
    res.status(500).json({ message: "Failed to load filters" });
  }
};
