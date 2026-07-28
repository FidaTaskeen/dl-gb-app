import express from "express";
import crypto from "crypto";
import Record from "../models/Record.js";
import FailureLog from "../models/FailureLog.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const FIELD_KEY_MAP = { RSN: "srno", IMEI: "imei", EAN: "ean", ICCID: "iccid", MACID: "macId" };

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
          matchedRecordId: existing._id,
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

    // One ID per submit attempt — every FailureLog row created below
    // (whether from a duplicate or a mismatch) shares this same value,
    // so the UI can group them as "one scan."
    const scanAttemptId = crypto.randomUUID();

    const duplicateInfo = await findDuplicates(dl, gb);
    if (duplicateInfo.length > 0) {
      await Promise.all(
        duplicateInfo.map((d) =>
          FailureLog.create({
            protocol,
            failureType: "DUPLICATE",
            failureReason: `Duplicate ${d.field}`,
            fieldName: d.field,
            scannedValue: d.value,
            relatedRecordId: d.matchedRecordId || null,
            relatedRsn: d.matchedRsn,
            relatedImei: d.matchedImei,
            relatedIccid: d.matchedIccid,
            createdBy: req.userId,
            scanAttemptId,
          })
        )
      );

      return res.status(409).json({ error: "Duplicate detected", duplicateInfo });
    }

    const record = await Record.create({ dl, gb, protocol, createdBy: req.userId });

    if (record.status === "FAIL") {
      const mismatchFields = record.mismatchParams.split(",").map((s) => s.trim()).filter(Boolean);
      await Promise.all(
        mismatchFields.map((field) => {
          const key = FIELD_KEY_MAP[field];
          const dlValue = record.dl?.[key] || "";
          const gbValue = record.gb?.[key] || "";
          return FailureLog.create({
            protocol,
            failureType: "MISMATCH",
            failureReason: `${field} mismatch`,
            fieldName: field,
            scannedValue: `DL: ${dlValue || "-"} | GB: ${gbValue || "-"}`,
            dlValue,
            gbValue,
            createdBy: req.userId,
            scanAttemptId,
          });
        })
      );
    }

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