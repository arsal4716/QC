const statsService = require('../services/statsService');
const { success, error } = require('../utils/apiResponse');

exports.getStats = async (req, res) => {
  try {
    const stats = await statsService.getStats(req.query);
    return success(res, stats);
  } catch (e) {
    console.error('Stats Error:', e);
    return error(res, { status: 500, message: 'Failed to fetch statistics' });
  }
};
