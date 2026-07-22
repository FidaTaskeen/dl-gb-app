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

async function findDuplicates(dl, gb) {
  const duplicateInfo = [];

  for (const { key, label } of DUPLICATE_CHECK_FIELDS) {
    const dlVal = dl?.[key];
    const gbVal = gb?.[key];
    const valuesToCheck = [...new Set([dlVal, gbVal].filter(Boolean))];

    for (const val of valuesToCheck) {
      const existing = await Record.findOne({
        $or: [{ [`dl.${key}`]: val }, { [`gb.${key}`]: val }],
      }).sort({ createdAt: -1 });

      if (existing) {
        duplicateInfo.push({
          field: label,
          value: val,
          matchedRsn: existing.dl?.srno || existing.gb?.srno || "",
          matchedImei: existing.dl?.imei || existing.gb?.imei || "",
          matchedIccid: existing.dl?.iccid || existing.gb?.iccid || "",
        });
      }
    }
  }

  return duplicateInfo;
}

router.post("/", async (req, res) => {
  try {
    const { dl, gb, protocol } = req.body;

    // ANY single field match (RSN, IMEI, ICCID, or MACID) blocks the
    // whole submission — full or partial duplicate, nothing is saved.
    const duplicateInfo = await findDuplicates(dl, gb);
    if (duplicateInfo.length > 0) {
      return res.status(409).json({
        error: "Duplicate detected",
        duplicateInfo,
      });
    }

    const record = await Record.create({ dl, gb, protocol, createdBy: req.userId });
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