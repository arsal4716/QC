const success = (res, data = {}, status = 200) => {
  return res.status(status).json({
    success: true,
    data: data.data || data,
    meta: data.meta || {}
  });
};

const error = (res, { status = 500, message = "Internal Server Error", details = null }) => {
  return res.status(status).json({
    success: false,
    error: {
      message,
      details,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = { success, error };