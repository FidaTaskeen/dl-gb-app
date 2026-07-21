import express from "express";
import Record from "../models/Record.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  try {
    const { dl, gb, protocol } = req.body;
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

// Deletes every document in the records collection only.
// Does not touch users, auth, or any other collection.
router.delete("/clear-all", async (req, res) => {
  try {
    const result = await Record.deleteMany({});
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;