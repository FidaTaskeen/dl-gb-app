import express from "express";
import FailureLog from "../models/FailureLog.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// List failure log entries, latest first. Supports:
//   protocol   - "Modbus" | "Zigbee"
//   fieldName  - "RSN" | "IMEI" | "EAN" | "ICCID" | "MACID"
//   from / to  - date range (matches createdAt)
//   search     - free text, matched against RSN / DL value / GB value
router.get("/", async (req, res) => {
  try {
    const { protocol, fieldName, from, to, search, page = 1, limit = 1000 } = req.query;
    const filter = {};

    if (protocol) filter.protocol = protocol;
    if (fieldName) filter.fieldName = fieldName;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      const re = new RegExp(search.trim(), "i");
      filter.$or = [{ rsn: re }, { dlValue: re }, { gbValue: re }, { fieldName: re }];
    }

    const logs = await FailureLog.find(filter)
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await FailureLog.countDocuments(filter);
    res.json({ logs, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear the entire failure log. This ONLY deletes FailureLog entries — the
// main Records collection (and therefore the Reports / Duplicate Report
// pages) is completely untouched.
router.delete("/", async (req, res) => {
  try {
    const result = await FailureLog.deleteMany({});
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;