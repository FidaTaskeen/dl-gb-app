import express from "express";
import Record from "../models/Record.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// EAN is intentionally excluded — same across every Modbus unit.
const DUPLICATE_CHECK_FIELDS = [
  { key: "srno", label: "RSN" },
  { key: "imei", label: "IMEI" },
  { key: "iccid", label: "ICCID" },
  { key: "macId", label: "MACID" }, // only meaningful for Zigbee; empty/blank values are skipped below
];

// Finds every previous record that shares an RSN, IMEI, ICCID, or MAC ID
// with the current dl/gb data. Returns the matched field info plus the
// single earliest matching record (the "original" this counts against).
async function findDuplicates(dl, gb) {
  const duplicateInfo = [];
  let earliestOriginal = null;

  for (const { key, label } of DUPLICATE_CHECK_FIELDS) {
    const dlVal = dl?.[key];
    const gbVal = gb?.[key];
    const valuesToCheck = [...new Set([dlVal, gbVal].filter(Boolean))];

    for (const val of valuesToCheck) {
      const existing = await Record.findOne({
        $or: [{ [`dl.${key}`]: val }, { [`gb.${key}`]: val }],
      }).sort({ createdAt: 1 }); // earliest first

      if (existing) {
        duplicateInfo.push({
          field: label,
          value: val,
          matchedRsn: existing.dl?.srno || existing.gb?.srno || "",
          matchedImei: existing.dl?.imei || existing.gb?.imei || "",
          matchedIccid: existing.dl?.iccid || existing.gb?.iccid || "",
        });

        // Track the single earliest matching record across all fields —
        // that's the canonical "original" this duplicate counts against.
        // If that original is itself already a duplicate, count against
        // ITS original instead, so counts always roll up to the true first scan.
        const canonicalId = existing.duplicateOf || existing._id;
        if (!earliestOriginal || existing.createdAt < earliestOriginal.createdAt) {
          earliestOriginal = { _id: canonicalId, createdAt: existing.createdAt };
        }
      }
    }
  }

  return { duplicateInfo, originalId: earliestOriginal?._id || null };
}

router.post("/", async (req, res) => {
  try {
    const { dl, gb, protocol } = req.body;

    const { duplicateInfo, originalId } = await findDuplicates(dl, gb);
    const isDuplicate = duplicateInfo.length > 0;

    const record = await Record.create({
      dl,
      gb,
      protocol,
      createdBy: req.userId,
      isDuplicate,
      duplicateOf: isDuplicate ? originalId : null,
      duplicateInfo,
    });

    let occurrenceCount = 1;
    if (isDuplicate && originalId) {
      const original = await Record.findByIdAndUpdate(
        originalId,
        { $inc: { duplicateCount: 1 } },
        { new: true }
      );
      // How many total times this DL/GB identity has now been scanned,
      // including the very first (original) scan.
      occurrenceCount = (original?.duplicateCount || 0) + 1;
    }

    res.status(201).json({ ...record.toObject(), occurrenceCount });
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