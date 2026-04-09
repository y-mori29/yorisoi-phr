/**
 * デモモード用モックAPIルート
 * 環境変数 DEMO_MODE=1 の時にメインルートの代わりに使用される
 * Firestore不要でサンプルデータを返す
 */

const express = require("express");
const router = express.Router();

// --- サンプルデータ ---

const PROFILE = {
  displayName: "デモユーザー",
  diagnosisName: "潰瘍性大腸炎",
  diagnosisDate: "2020-06-15",
  createdAt: "2020-06-15T00:00:00Z",
};

const TIMELINE_EVENTS = [
  { id: "ev1", date: "2020-06-15", category: "diagnosis", title: "潰瘍性大腸炎と診断", detail: "○○大学病院 消化器内科にて確定診断。全大腸炎型。", source: "manual" },
  { id: "ev2", date: "2020-06-20", category: "medication_change", title: "ペンタサ処方開始", detail: "メサラジン 1日3回 経口", source: "manual" },
  { id: "ev3", date: "2020-09-10", category: "exam", title: "大腸内視鏡検査", detail: "軽度の炎症所見あり。生検実施。", source: "manual" },
  { id: "ev4", date: "2021-03-05", category: "hospitalization", title: "再燃により入院（10日間）", detail: "○○大学病院。ステロイドパルス療法実施。", source: "manual" },
  { id: "ev5", date: "2021-03-15", category: "medication_change", title: "プレドニン追加", detail: "プレドニゾロン30mg/日から漸減", source: "manual" },
  { id: "ev6", date: "2021-08-01", category: "treatment_change", title: "ステロイド離脱成功", detail: "プレドニゾロン完全中止。ペンタサ単独に。", source: "manual" },
  { id: "ev7", date: "2022-04-20", category: "exam", title: "大腸内視鏡検査", detail: "粘膜治癒確認。寛解維持。", source: "manual" },
  { id: "ev8", date: "2023-11-10", category: "medication_change", title: "リアルダに変更", detail: "ペンタサ→リアルダ（1日1回に簡素化）", source: "manual" },
  { id: "ev9", date: "2024-05-15", category: "exam", title: "定期内視鏡", detail: "異常なし。寛解維持継続。", source: "manual" },
  { id: "ev10", date: "2025-12-01", category: "other", title: "引っ越しに伴い転院", detail: "○○大学病院 → △△クリニック IBD外来", source: "manual" },
];

const MEDICATIONS = [
  { id: "m1", name: "リアルダ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2023-11-10", endDate: null, isActive: true, changeReason: "1日1回に簡素化のため変更", sideNotes: "食後に服用" },
  { id: "m2", name: "ビオフェルミン", genericName: "", category: "other", dosageForm: "経口", startDate: "2020-06-20", endDate: null, isActive: true, changeReason: "腸内環境の改善", sideNotes: "" },
  { id: "m3", name: "ペンタサ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2020-06-20", endDate: "2023-11-10", isActive: false, changeReason: "初回処方", sideNotes: "1日3回 食後" },
  { id: "m4", name: "プレドニン", genericName: "プレドニゾロン", category: "steroid", dosageForm: "経口", startDate: "2021-03-05", endDate: "2021-08-01", isActive: false, changeReason: "再燃時のステロイドパルス", sideNotes: "30mg→漸減→中止" },
];

function generateSymptomLogs() {
  const logs = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (Math.random() > 0.25) {
      const dateStr = d.toISOString().slice(0, 10);
      const bowel = Math.floor(Math.random() * 4) + 1;
      logs.push({
        id: dateStr,
        date: dateStr,
        bowelCount: bowel,
        bristolScale: Math.min(Math.max(Math.floor(Math.random() * 3) + 3, 1), 7),
        bleeding: Math.random() < 0.1,
        painScore: Math.floor(Math.random() * 3),
        memo: "",
      });
    }
  }
  return logs;
}

const SYMPTOM_LOGS = generateSymptomLogs();

// --- APIエンドポイント ---

// プロフィール
router.get("/api/profile", (_req, res) => res.json(PROFILE));
router.put("/api/profile", (req, res) => res.json({ ...PROFILE, ...req.body }));

// タイムライン
router.get("/api/timeline", (_req, res) => {
  res.json([...TIMELINE_EVENTS].sort((a, b) => b.date.localeCompare(a.date)));
});
router.post("/api/timeline", (req, res) => {
  const ev = { id: "ev" + Date.now(), ...req.body, source: "manual", createdAt: new Date().toISOString() };
  TIMELINE_EVENTS.push(ev);
  res.status(201).json(ev);
});
router.put("/api/timeline/:id", (req, res) => {
  const idx = TIMELINE_EVENTS.findIndex((e) => e.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  Object.assign(TIMELINE_EVENTS[idx], req.body);
  res.json(TIMELINE_EVENTS[idx]);
});
router.delete("/api/timeline/:id", (req, res) => {
  const idx = TIMELINE_EVENTS.findIndex((e) => e.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  TIMELINE_EVENTS.splice(idx, 1);
  res.json({ deleted: true });
});

// 薬管理
router.get("/api/medications", (_req, res) => {
  res.json([...MEDICATIONS].sort((a, b) => b.startDate.localeCompare(a.startDate)));
});
router.get("/api/medications/active", (_req, res) => {
  res.json(MEDICATIONS.filter((m) => m.isActive));
});
router.post("/api/medications", (req, res) => {
  const med = { id: "m" + Date.now(), ...req.body, isActive: !req.body.endDate, createdAt: new Date().toISOString() };
  MEDICATIONS.push(med);
  res.status(201).json(med);
});
router.put("/api/medications/:id", (req, res) => {
  const idx = MEDICATIONS.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  Object.assign(MEDICATIONS[idx], req.body);
  if (req.body.endDate !== undefined) MEDICATIONS[idx].isActive = !req.body.endDate;
  res.json(MEDICATIONS[idx]);
});
router.delete("/api/medications/:id", (req, res) => {
  const idx = MEDICATIONS.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  MEDICATIONS.splice(idx, 1);
  res.json({ deleted: true });
});

// 薬剤マスタ
router.get("/api/master/medications", (_req, res) => {
  const master = require("../../data/medication-master.json");
  res.json(master);
});

// 症状記録
router.get("/api/symptoms", (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  res.json(SYMPTOM_LOGS.filter((l) => l.date >= sinceStr).sort((a, b) => b.date.localeCompare(a.date)));
});
router.get("/api/symptoms/today", (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const log = SYMPTOM_LOGS.find((l) => l.date === today);
  res.json(log || null);
});
router.get("/api/symptoms/summary", (req, res) => {
  const days = parseInt(req.query.days) || 14;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  const logs = SYMPTOM_LOGS.filter((l) => l.date >= sinceStr);
  if (logs.length === 0) return res.json({ days, count: 0, avgBowelCount: null, bleedingDays: 0, avgPainScore: null });
  const avg = logs.reduce((s, l) => s + l.bowelCount, 0) / logs.length;
  const bleed = logs.filter((l) => l.bleeding).length;
  const painLogs = logs.filter((l) => l.painScore != null);
  const avgPain = painLogs.length > 0 ? painLogs.reduce((s, l) => s + l.painScore, 0) / painLogs.length : null;
  res.json({ days, count: logs.length, avgBowelCount: Math.round(avg * 10) / 10, bleedingDays: bleed, avgPainScore: avgPain != null ? Math.round(avgPain * 10) / 10 : null });
});
router.post("/api/symptoms", (req, res) => {
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const existing = SYMPTOM_LOGS.findIndex((l) => l.date === date);
  const log = { id: date, ...req.body, date };
  if (existing >= 0) SYMPTOM_LOGS[existing] = log;
  else SYMPTOM_LOGS.push(log);
  res.status(201).json(log);
});
router.delete("/api/symptoms/:date", (req, res) => {
  const idx = SYMPTOM_LOGS.findIndex((l) => l.date === req.params.date);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  SYMPTOM_LOGS.splice(idx, 1);
  res.json({ deleted: true });
});

// サマリー
router.get("/api/summary", (_req, res) => {
  const active = MEDICATIONS.filter((m) => m.isActive);
  const recent = [...TIMELINE_EVENTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().slice(0, 10);
  const symptomLogs = SYMPTOM_LOGS.filter((l) => l.date >= sinceStr);

  let symptomSummary = null;
  if (symptomLogs.length > 0) {
    const avg = symptomLogs.reduce((s, l) => s + l.bowelCount, 0) / symptomLogs.length;
    const bleed = symptomLogs.filter((l) => l.bleeding).length;
    const painLogs = symptomLogs.filter((l) => l.painScore != null);
    const avgPain = painLogs.length > 0 ? painLogs.reduce((s, l) => s + l.painScore, 0) / painLogs.length : null;
    symptomSummary = {
      days: 14,
      recordedDays: symptomLogs.length,
      avgBowelCount: Math.round(avg * 10) / 10,
      bleedingDays: bleed,
      avgPainScore: avgPain != null ? Math.round(avgPain * 10) / 10 : null,
    };
  }

  res.json({ profile: PROFILE, activeMedications: active, recentEvents: recent, symptomSummary });
});

// ヘルスチェック
router.get("/health", (_req, res) => res.json({ status: "ok", mode: "demo" }));

module.exports = router;
