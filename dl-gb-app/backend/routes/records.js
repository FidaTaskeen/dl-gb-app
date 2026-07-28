import express from "express";
import Record from "../models/Record.js";
import FailureLog from "../models/FailureLog.js";
import requireAuth from "../middleware/auth.js";
import { detectDuplicates } from "../utils/duplicateDetection.js";

const router = express.Router();
router.use(requireAuth);

const FIELD_VALUE_KEY = { RSN: "srno", IMEI: "imei", EAN: "ean", ICCID: "iccid", MACID: "macId" };

router.post("/", async (req, res) => {
  try {
    const { dl, gb, protocol } = req.body;

    // Additive only: this only annotates the record with duplicate/repeat
    // info. It never changes dl/gb/protocol and never affects the PASS/FAIL
    // outcome, which is still decided entirely by Record.js's pre-validate hook.
    const duplicateInfo = await detectDuplicates({ dl, protocol });

    const record = await Record.create({
      dl,
      gb,
      protocol,
      createdBy: req.userId,
      duplicateStatus: duplicateInfo.status,
      duplicateDetails: duplicateInfo.details,
      duplicateCount: duplicateInfo.duplicateCount,
      previousScanAt: duplicateInfo.previousScanAt,
      repeatedParams: duplicateInfo.repeatedParams,
    });

    // Additive only: log each mismatched field into a separate Failure Log
    // collection. This never affects the record just created above or the
    // response sent back to the Check page.
    if (record.status === "FAIL" && record.mismatchParams && record.mismatchParams !== "OK") {
      try {
        const fields = record.mismatchParams.split(",").map((f) => f.trim()).filter(Boolean);
        const entries = fields.map((fieldName) => {
          const key = FIELD_VALUE_KEY[fieldName];
          return {
            recordId: record._id,
            protocol: record.protocol,
            rsn: record.dl?.srno || "-",
            fieldName,
            dlValue: (key && record.dl?.[key]) || "-",
            gbValue: (key && record.gb?.[key]) || "-",
            failureReason: record.mismatchParams,
            duplicateStatus: record.duplicateStatus,
            duplicateDetails: record.duplicateDetails,
            createdBy: req.userId,
          };
        });
        if (entries.length > 0) await FailureLog.insertMany(entries);
      } catch (logErr) {
        // Never let failure-log writing block the actual check submission.
      }
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

// Delete ALL records (used by "Clear Report Data" on the Reports page).
// Every authenticated user can trigger this since there are no roles yet;
// the frontend guards it behind a confirmation prompt.
router.delete("/", async (req, res) => {
  try {
    const result = await Record.deleteMany({});
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single record by id, in case a one-off correction is needed.
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Record.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Record not found" });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;