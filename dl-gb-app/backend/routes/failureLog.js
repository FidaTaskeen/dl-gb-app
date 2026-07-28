import express from "express";
import FailureLog from "../models/FailureLog.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const { search, failureType, fieldName, protocol, from, to, page = 1, limit = 500 } = req.query;
    const filter = {};

    if (failureType) filter.failureType = failureType;
    if (fieldName) filter.fieldName = fieldName;
    if (protocol) filter.protocol = protocol;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [
        { failureReason: re },
        { fieldName: re },
        { scannedValue: re },
        { dlValue: re },
        { gbValue: re },
        { relatedRsn: re },
        { relatedImei: re },
        { relatedIccid: re },
      ];
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

router.delete("/clear-all", async (req, res) => {
  try {
    const result = await FailureLog.deleteMany({});
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;