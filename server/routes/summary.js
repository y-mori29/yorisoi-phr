const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

/**
 * GET /api/summary — 診察用サマリーデータを一括取得
 *
 * 医師に見せる1画面に必要な情報をまとめて返す：
 * - プロフィール（疾患名・診断日）
 * - 現在服用中の薬
 * - 直近のタイムラインイベント（最大10件）
 * - 直近14日間の症状サマリー
 */
router.get("/", async (req, res) => {
  try {
    const root = userRef(req.lineUserId);

    const since = new Date();
    since.setDate(since.getDate() - 14);
    const sinceStr = since.toISOString().slice(0, 10);

    const [profileDoc, activeMedsSnap, recentEventsSnap, symptomSnap] = await Promise.all([
      root.get(),
      root
        .collection("medications")
        .where("isActive", "==", true)
        .orderBy("startDate", "desc")
        .get(),
      root
        .collection("timeline_events")
        .orderBy("date", "desc")
        .limit(10)
        .get(),
      root
        .collection("symptom_logs")
        .where("date", ">=", sinceStr)
        .orderBy("date", "desc")
        .get(),
    ]);

    const profile = profileDoc.exists ? profileDoc.data() : null;
    const activeMedications = activeMedsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    const recentEvents = recentEventsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const symptomLogs = symptomSnap.docs.map((d) => d.data());
    let symptomSummary = null;
    if (symptomLogs.length > 0) {
      const avgBowel = symptomLogs.reduce((s, l) => s + (l.bowelCount || 0), 0) / symptomLogs.length;
      const bleedDays = symptomLogs.filter((l) => l.bleeding).length;
      const painLogs = symptomLogs.filter((l) => l.painScore != null);
      const avgPain = painLogs.length > 0
        ? painLogs.reduce((s, l) => s + l.painScore, 0) / painLogs.length
        : null;
      symptomSummary = {
        days: 14,
        recordedDays: symptomLogs.length,
        avgBowelCount: Math.round(avgBowel * 10) / 10,
        bleedingDays: bleedDays,
        avgPainScore: avgPain != null ? Math.round(avgPain * 10) / 10 : null,
      };
    }

    res.json({
      profile,
      activeMedications,
      recentEvents,
      symptomSummary,
    });
  } catch (err) {
    console.error("GET /summary error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

module.exports = router;
