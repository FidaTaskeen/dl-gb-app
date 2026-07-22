import express from "express";
import Record from "../models/Record.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// EAN excluded — identical across all Modbus units.
const DUPLICATE_CHECK_FIELDS = [
  { key: "srno", label: "RSN" },
  { key: "imei", label: "IMEI" },
  { key: "iccid", label: "ICCID" },
  { key: "macId", label: "MACID" },
];

// Finds every previous record that shares an RSN/IMEI/ICCID/MACID with
// the current dl/gb data, per field.
async function findFieldMatches(dl, gb) {
  const matches = [];

  for (const { key, label } of DUPLICATE_CHECK_FIELDS) {
    const dlVal = dl?.[key];
    const gbVal = gb?.[key];
    const valuesToCheck = [...new Set([dlVal, gbVal].filter(Boolean))];

    for (const val of valuesToCheck) {
      const existing = await Record.findOne({
        $or: [{ [`dl.${key}`]: val }, { [`gb.${key}`]: val }],
      }).sort({ createdAt: -1 });

      if (existing) {
        matches.push({
          field: label,
          value: val,
          matchedRecordId: String(existing._id),
          matchedRsn: existing.dl?.srno || existing.gb?.srno || "",
          matchedImei: existing.dl?.imei || existing.gb?.imei || "",
          matchedIccid: existing.dl?.iccid || existing.gb?.iccid || "",
        });
      }
    }
  }

  return matches;
}

// A FULL duplicate = every one of RSN/IMEI/ICCID (and MACID for
// Zigbee) matched the SAME previous record. If the matches point to
// different previous records, or don't cover every checked field,
// it's only a partial duplicate.
function isFullDuplicate(matches, protocol) {
  const requiredFields = protocol === "Zigbee"
    ? ["RSN", "IMEI", "ICCID", "MACID"]
    : ["RSN", "IMEI", "ICCID"];

  const matchedFields = new Set(matches.map((m) => m.field));
  const allFieldsCovered = requiredFields.every((f) => matchedFields.has(f));
  if (!allFieldsCovered) return false;

  // All matches (for the required fields) must point to the exact
  // same previous record for this to count as a full duplicate.
  const relevantMatches = matches.filter((m) => requiredFields.includes(m.field));
  const recordIds = new Set(relevantMatches.map((m) => m.matchedRecordId));
  return recordIds.size === 1;
}

router.post("/", async (req, res) => {
  try {
    const { dl, gb, protocol } = req.body;

    const matches = await findFieldMatches(dl, gb);

    if (matches.length > 0 && isFullDuplicate(matches, protocol)) {
      // Complete duplicate of one existing record — reject, save nothing.
      return res.status(409).json({
        error: "Duplicate detected",
        duplicateInfo: matches,
      });
    }

    // Either no matches, or only a partial match (e.g. just IMEI
    // reused with a different RSN/ICCID) — save normally, but flag it
    // so the warning/report can show which field was reused.
    const isDuplicate = matches.length > 0;

    const record = await Record.create({
      dl,
      gb,
      protocol,
      createdBy: req.userId,
      isDuplicate,
      duplicateInfo: isDuplicate ? matches : [],
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 500 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const records = await Record.find(filter)
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Record.countDocuments(filter);
    res.json({ records, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/clear-all", async (req, res) => {
  try {
    const result = await Record.deleteMany({});
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;