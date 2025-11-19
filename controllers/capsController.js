const Cap = require('../models/Caps');

const getCurrentESTDate = () => {
  const now = new Date();
  const estOffset = -5 * 60;
  const estTime = new Date(now.getTime() + (estOffset - now.getTimezoneOffset()) * 60000);
  return estTime.toISOString().split('T')[0];
};

exports.getCaps = async (req, res) => {
  try {
    const caps = await Cap.find().sort({ name: 1 });
    const today = getCurrentESTDate();

    const transformed = caps.map(cap => {
      const todayData = cap.dailyCalls.find(d => d.date === today);
      return {
        _id: cap._id,
        name: cap.name,
        target_name: cap.target_name,
        target: cap.target,
        completedCalls: todayData ? todayData.completedCalls : 0,
        paidCalls: todayData ? todayData.paidCalls : 0,
        totalCompletedCalls: cap.totalCompletedCalls,
        totalPaidCalls: cap.totalPaidCalls,
        updatedAt: cap.updatedAt
      };
    });

    res.json({ success: true, data: transformed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const { target } = req.body;

    const updated = await Cap.findByIdAndUpdate(
      id,
      { target },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.processPixelFire = async (req, res) => {
  try {
    const { target_id, target_name, status, paid, duration } = req.query;

    if (!target_id) {
      return res.status(400).json({ success: false, message: "target_id is required" });
    }

    const isCompleted =
      status === "completed" ||
      status === "success" ||
      Number(duration) > 0;

    if (!isCompleted) {
      return res.json({ success: true, message: "Call not completed, skipping" });
    }

    const today = getCurrentESTDate();

    let cap = await Cap.findOne({ name: target_id });

    const paidBool = paid === "true" || paid === "True" || paid === "1";

    if (!cap) {
      cap = new Cap({
        name: target_id,
        target_name: target_name || "",
        target: 0,
        dailyCalls: [{
          date: today,
          completedCalls: 1,
          paidCalls: paidBool ? 1 : 0
        }],
        totalCompletedCalls: 1,
        totalPaidCalls: paidBool ? 1 : 0
      });
    } else {
      let todayEntry = cap.dailyCalls.find(d => d.date === today);
      if (!todayEntry) {
        cap.dailyCalls.push({
          date: today,
          completedCalls: 1,
          paidCalls: paidBool ? 1 : 0
        });
      } else {
        todayEntry.completedCalls += 1;
        if (paidBool) todayEntry.paidCalls += 1;
      }

      cap.totalCompletedCalls += 1;
      if (paidBool) cap.totalPaidCalls += 1;

      cap.target_name = target_name || cap.target_name;
      cap.updatedAt = new Date();
    }

    await cap.save();

    res.json({ success: true, message: "Pixel processed", data: cap });

  } catch (err) {
    console.error("Pixel error:", err);
    res.json({ success: false, message: "Server error but call recorded" });
  }
};
