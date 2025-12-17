const Cap = require("../models/Caps");

/**
 * EST Date YYYY-MM-DD
 */
const getCurrentESTDate = () => {
  const now = new Date();
  const estOffset = -5 * 60;
  const estTime = new Date(
    now.getTime() + (estOffset - now.getTimezoneOffset()) * 60000
  );
  return estTime.toISOString().split("T")[0];
};

const calcPercent = (paid, target) => {
  if (!target || target === 0) return 0;
  return Number(((paid / target) * 100).toFixed(2));
};

/**
 * GET CAPS (DATE RANGE + SORTING)
 * /caps?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&sortBy=paidCalls&order=desc
 */
exports.getCaps = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      sortBy = "target_name",
      order = "asc",
    } = req.query;

    const caps = await Cap.find();

    const start = startDate || getCurrentESTDate();
    const end = endDate || start;

    let transformed = caps.map((cap) => {
      const rangeData = cap.dailyCalls.filter(
        (d) => d.date >= start && d.date <= end
      );

      const completedCalls = rangeData.reduce(
        (sum, d) => sum + d.completedCalls,
        0
      );

      const paidCalls = rangeData.reduce(
        (sum, d) => sum + d.paidCalls,
        0
      );

      const percentComplete = calcPercent(paidCalls, cap.target);

      return {
        _id: cap._id,
        name: cap.name,
        target_name: cap.target_name,
        target: cap.target,
        completedCalls,
        paidCalls,
        percentComplete,
        updatedAt: cap.updatedAt,
      };
    });

    // SORTING
    transformed.sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;

      if (typeof aVal === "string") {
        return order === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return order === "asc" ? aVal - bVal : bVal - aVal;
    });

    res.json({ success: true, data: transformed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * UPDATE TARGET
 */
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

/**
 * PIXEL FIRE (DAILY STATS)
 */
exports.processPixelFire = async (req, res) => {
  try {
    const { target_id, target_name, status, paid, duration } = req.query;

    if (!target_id) {
      return res
        .status(400)
        .json({ success: false, message: "target_id is required" });
    }

    const isCompleted =
      status === "completed" ||
      status === "success" ||
      Number(duration) > 0;

    if (!isCompleted) {
      return res.json({ success: true, message: "Call skipped" });
    }

    const today = getCurrentESTDate();
    const paidBool = paid === "true" || paid === "True" || paid === "1";

    let cap = await Cap.findOne({ name: target_id });

    if (!cap) {
      cap = new Cap({
        name: target_id,
        target_name: target_name || "",
        target: 0,
        dailyCalls: [
          {
            date: today,
            completedCalls: 1,
            paidCalls: paidBool ? 1 : 0,
          },
        ],
      });
    } else {
      let todayEntry = cap.dailyCalls.find((d) => d.date === today);

      if (!todayEntry) {
        cap.dailyCalls.push({
          date: today,
          completedCalls: 1,
          paidCalls: paidBool ? 1 : 0,
        });
      } else {
        todayEntry.completedCalls += 1;
        if (paidBool) todayEntry.paidCalls += 1;
      }

      cap.target_name = target_name || cap.target_name;
      cap.updatedAt = new Date();
    }

    await cap.save();

    res.json({ success: true, message: "Pixel processed" });
  } catch (err) {
    console.error("Pixel error:", err);
    res.json({ success: false, message: "Server error but call recorded" });
  }
};
