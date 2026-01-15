const Cap = require("../models/Caps");

/**
 * Get current EST date (YYYY-MM-DD)
 */
const getCurrentESTDate = () => {
  const now = new Date();
  const estOffset = -5 * 60;
  const estTime = new Date(
    now.getTime() + (estOffset - now.getTimezoneOffset()) * 60000
  );
  return estTime.toISOString().split("T")[0];
};

/**
 * Calculate percent safely
 */
const calcPercent = (paid, target) => {
  if (!target || target === 0) return 0;
  return Number(((paid / target) * 100).toFixed(2));
};

/**
 * Calculate inclusive day range
 */
const getDaysBetween = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(
    1,
    Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1
  );
};

/**
 * GET CAPS (DATE-RANGE AWARE TARGET)
 */
exports.getCaps = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      sortBy = "percentComplete",
      order = "desc",
    } = req.query;

    const caps = await Cap.find();

    const start = startDate || getCurrentESTDate();
    const end = endDate || start;
    const days = getDaysBetween(start, end);

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

      // ✅ DAILY TARGET × NUMBER OF DAYS
      const adjustedTarget = cap.target * days;
      const percentComplete = calcPercent(paidCalls, adjustedTarget);

      return {
        _id: cap._id,
        name: cap.name,
        target_name: cap.target_name,
        baseTarget: cap.target,       // daily target
        target: adjustedTarget,       // range target
        days,
        completedCalls,
        paidCalls,
        percentComplete,
        updatedAt: cap.updatedAt,
      };
    });

    // Sorting
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
 * UPDATE DAILY TARGET
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
 * EXPORT CAPS CSV
 */
exports.exportCaps = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const caps = await Cap.find();

    const start = startDate || getCurrentESTDate();
    const end = endDate || start;
    const days = getDaysBetween(start, end);

    const rows = caps.map((cap) => {
      const rangeData = cap.dailyCalls.filter(
        (d) => d.date >= start && d.date <= end
      );

      const paidCalls = rangeData.reduce(
        (sum, d) => sum + d.paidCalls,
        0
      );

      const adjustedTarget = cap.target * days;

      return {
        Target: cap.target_name || cap.name,
        Days: days,
        DailyTarget: cap.target,
        RangeTarget: adjustedTarget,
        PaidCalls: paidCalls,
        PercentComplete: calcPercent(paidCalls, adjustedTarget),
      };
    });

    res.header("Content-Type", "text/csv");
    res.attachment("caps_export.csv");

    const csv = [
      Object.keys(rows[0]).join(","),
      ...rows.map((r) => Object.values(r).join(",")),
    ].join("\n");

    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PIXEL PROCESSING (UNCHANGED)
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
