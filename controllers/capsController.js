const Cap = require('../models/Caps');
const { fetchCapsFromRingba } = require('../services/CapsService');

exports.getCaps = async (req, res) => {
  try {
    const caps = await Cap.find().sort({ name: 1 });
    res.json({ success: true, data: caps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.fetchAndSaveCaps = async (req, res) => {
  try {
    const newCaps = await fetchCapsFromRingba();
    await Cap.deleteMany({});
    const saved = await Cap.insertMany(newCaps);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const { target } = req.body;
    const updated = await Cap.findByIdAndUpdate(id, { target }, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
