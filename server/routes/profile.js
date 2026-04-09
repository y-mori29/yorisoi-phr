const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

// GET /api/profile
router.get("/", async (req, res) => {
  try {
    const doc = await userRef(req.lineUserId).get();
    if (!doc.exists) {
      return res.json(null);
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("GET /profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/profile
router.put("/", async (req, res) => {
  try {
    const { displayName, diagnosisName, diagnosisDate } = req.body;
    const data = {
      displayName: displayName || "",
      diagnosisName: diagnosisName || "潰瘍性大腸炎",
      diagnosisDate: diagnosisDate || null,
      updatedAt: new Date(),
    };

    const ref = userRef(req.lineUserId);
    const doc = await ref.get();
    if (!doc.exists) {
      data.createdAt = new Date();
    }
    await ref.set(data, { merge: true });

    res.json({ id: req.lineUserId, ...data });
  } catch (err) {
    console.error("PUT /profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;
