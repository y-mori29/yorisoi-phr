const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

const VALID_CATEGORIES = [
  "5-ASA",
  "steroid",
  "immunomodulator",
  "biologic",
  "jak_inhibitor",
  "other",
];

// GET /api/medications — 薬一覧（開始日降順）
router.get("/", async (req, res) => {
  try {
    const snap = await userRef(req.lineUserId)
      .collection("medications")
      .orderBy("startDate", "desc")
      .get();

    const meds = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(meds);
  } catch (err) {
    console.error("GET /medications error:", err);
    res.status(500).json({ error: "Failed to fetch medications" });
  }
});

// GET /api/medications/active — 現在服用中の薬
router.get("/active", async (req, res) => {
  try {
    const snap = await userRef(req.lineUserId)
      .collection("medications")
      .where("isActive", "==", true)
      .orderBy("startDate", "desc")
      .get();

    const meds = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(meds);
  } catch (err) {
    console.error("GET /medications/active error:", err);
    res.status(500).json({ error: "Failed to fetch active medications" });
  }
});

// POST /api/medications — 薬追加
router.post("/", async (req, res) => {
  try {
    const {
      name,
      genericName,
      category,
      dosageForm,
      startDate,
      endDate,
      changeReason,
      sideNotes,
    } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({ error: "name and startDate are required" });
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const data = {
      name,
      genericName: genericName || "",
      category: category || "other",
      dosageForm: dosageForm || "",
      startDate,
      endDate: endDate || null,
      isActive: !endDate,
      changeReason: changeReason || "",
      sideNotes: sideNotes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await userRef(req.lineUserId)
      .collection("medications")
      .add(data);

    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /medications error:", err);
    res.status(500).json({ error: "Failed to create medication" });
  }
});

// PUT /api/medications/:id — 薬情報更新
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = userRef(req.lineUserId).collection("medications").doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Medication not found" });
    }

    const updates = { updatedAt: new Date() };
    const allowed = [
      "name",
      "genericName",
      "category",
      "dosageForm",
      "startDate",
      "endDate",
      "changeReason",
      "sideNotes",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // endDate が設定されたら isActive を false に
    if (updates.endDate !== undefined) {
      updates.isActive = !updates.endDate;
    }

    await ref.update(updates);
    res.json({ id, ...doc.data(), ...updates });
  } catch (err) {
    console.error("PUT /medications error:", err);
    res.status(500).json({ error: "Failed to update medication" });
  }
});

// DELETE /api/medications/:id — 薬削除
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = userRef(req.lineUserId).collection("medications").doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Medication not found" });
    }

    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /medications error:", err);
    res.status(500).json({ error: "Failed to delete medication" });
  }
});

module.exports = router;
