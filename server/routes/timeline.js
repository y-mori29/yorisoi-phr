const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

const VALID_CATEGORIES = [
  "diagnosis",
  "hospitalization",
  "medication_change",
  "exam",
  "treatment_change",
  "other",
];

// GET /api/timeline — イベント一覧（日付降順）
router.get("/", async (req, res) => {
  try {
    const snap = await userRef(req.lineUserId)
      .collection("timeline_events")
      .orderBy("date", "desc")
      .get();

    const events = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(events);
  } catch (err) {
    console.error("GET /timeline error:", err);
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

// POST /api/timeline — イベント追加
router.post("/", async (req, res) => {
  try {
    const { date, category, title, detail } = req.body;

    if (!date || !title) {
      return res.status(400).json({ error: "date and title are required" });
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const data = {
      date,
      category: category || "other",
      title,
      detail: detail || "",
      source: "manual",
      sourceSessionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await userRef(req.lineUserId)
      .collection("timeline_events")
      .add(data);

    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /timeline error:", err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// PUT /api/timeline/:eventId — イベント更新
router.put("/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { date, category, title, detail } = req.body;

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const ref = userRef(req.lineUserId)
      .collection("timeline_events")
      .doc(eventId);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    const updates = { updatedAt: new Date() };
    if (date !== undefined) updates.date = date;
    if (category !== undefined) updates.category = category;
    if (title !== undefined) updates.title = title;
    if (detail !== undefined) updates.detail = detail;

    await ref.update(updates);
    res.json({ id: eventId, ...doc.data(), ...updates });
  } catch (err) {
    console.error("PUT /timeline error:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// DELETE /api/timeline/:eventId — イベント削除
router.delete("/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const ref = userRef(req.lineUserId)
      .collection("timeline_events")
      .doc(eventId);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /timeline error:", err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

module.exports = router;
