const { DateTime } = require("luxon");

function estRangeToUTC({ preset, startISO, endISO }) {
  const nowEST = DateTime.now().setZone("America/New_York");
  let start, end;

  switch (preset) {
    case "today":
      start = nowEST.startOf("day");
      end = nowEST.endOf("day");
      break;
    case "yesterday":
      start = nowEST.minus({ days: 1 }).startOf("day");
      end = nowEST.minus({ days: 1 }).endOf("day");
      break;
    case "last_2_days":
      start = nowEST.minus({ days: 2 }).startOf("day");
      end = nowEST.endOf("day");
      break;
    case "last_7_days":
      start = nowEST.minus({ days: 7 }).startOf("day");
      end = nowEST.endOf("day");
      break;
    case "this_week":
      start = nowEST.startOf("week");
      end = nowEST.endOf("week");
      break;
    case "last_week":
      start = nowEST.minus({ weeks: 1 }).startOf("week");
      end = nowEST.minus({ weeks: 1 }).endOf("week");
      break;
    case "last_30_days":
      start = nowEST.minus({ days: 30 }).startOf("day");
      end = nowEST.endOf("day");
      break;
    case "this_month":
      start = nowEST.startOf("month");
      end = nowEST.endOf("month");
      break;
    case "last_month":
      start = nowEST.minus({ months: 1 }).startOf("month");
      end = nowEST.minus({ months: 1 }).endOf("month");
      break;
    case "last_6_months":
      start = nowEST.minus({ months: 6 }).startOf("day");
      end = nowEST.endOf("day");
      break;
    case "this_year":
      start = nowEST.startOf("year");
      end = nowEST.endOf("year");
      break;
    case "custom":
      if (startISO)
        start = DateTime.fromISO(startISO, { zone: "America/New_York" });
      if (endISO) end = DateTime.fromISO(endISO, { zone: "America/New_York" });
      break;
    default:
      start = nowEST.startOf("day");
      end = nowEST.endOf("day");
  }

  return {
    startUTC: start ? start.toUTC().toJSDate() : undefined,
    endUTC: end ? end.toUTC().toJSDate() : undefined,
  };
}

function normalizeArray(val) {
  if (!val) return null;

  if (Array.isArray(val)) {
    const list = val.map((v) => String(v).trim()).filter(Boolean);
    return list.length ? list : null;
  }

  if (typeof val === "string") {
    const list = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : null;
  }

  return null;
}

function buildMatchStage(q) {
  const andConditions = [];
  const { startUTC, endUTC } = estRangeToUTC({
    preset: q.datePreset || q.preset,
    startISO: q.startDate,
    endISO: q.endDate,
  });

  if (startUTC || endUTC) {
    const range = {};
    if (startUTC) range.$gte = startUTC;
    if (endUTC) range.$lte = endUTC;
    andConditions.push({ callTimestamp: range });
  }

  const campaigns = normalizeArray(q.campaign);
  if (campaigns) {
    andConditions.push({
      campaignName: campaigns.length === 1 ? campaigns[0] : { $in: campaigns },
    });
  }

  const publishers = normalizeArray(q.publisher);
  if (publishers) {
    andConditions.push({
      $or: [
        { publisherName: { $in: publishers } },
        { systemPublisherId: { $in: publishers } },
      ],
    });
  }

  const dispositions = normalizeArray(q.disposition)?.map((d) =>
    d.toLowerCase()
  );
  if (dispositions && !dispositions.includes("all")) {
    andConditions.push({
      "qc.disposition":
        dispositions.length === 1 ? dispositions[0] : { $in: dispositions },
    });
  }

  if (q.status) andConditions.push({ status: q.status });
  if (q.callerId)
    andConditions.push({
      callerId: { $regex: String(q.callerId), $options: "i" },
    });
  if (q.systemCallId) andConditions.push({ systemCallId: q.systemCallId });
  if (q.search) {
    const re = new RegExp(q.search, "i");
    andConditions.push({
      $or: [
        { callerId: re },
        { campaignName: re },
        { publisherName: re },
        { "qc.reason": re },
        { "qc.summary": re },
        { transcript: re },
      ],
    });
  }

  return andConditions.length ? { $and: andConditions } : {};
}

module.exports = { buildMatchStage };
