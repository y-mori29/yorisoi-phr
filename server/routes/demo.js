/**
 * デモモード用モックAPIルート
 * Firestore不要でサンプルデータを返す
 * テンプレート駆動：疾患IDに応じてデータを切り替え
 */

const express = require("express");
const { listTemplates, getTemplate, getMedicationMaster } = require("../lib/templates");

const router = express.Router();

// ========================================
// テンプレート / コンフィグ API
// ========================================

// GET /api/templates — 利用可能な疾患テンプレート一覧
router.get("/api/templates", (_req, res) => {
  res.json(listTemplates());
});

// GET /api/config?disease=uc — 指定疾患のテンプレート取得
router.get("/api/config", (req, res) => {
  const diseaseId = req.query.disease || "uc";
  const tmpl = getTemplate(diseaseId);
  if (!tmpl) return res.status(404).json({ error: `Template '${diseaseId}' not found` });
  res.json(tmpl);
});

// GET /api/master/medications?disease=uc — 疾患別薬剤マスタ
router.get("/api/master/medications", (req, res) => {
  const diseaseId = req.query.disease || "uc";
  const master = getMedicationMaster(diseaseId);
  if (!master) return res.status(404).json({ error: `Medication master for '${diseaseId}' not found` });
  res.json(master);
});

// ========================================
// 疾患別デモデータ
// ========================================

const DEMO_DATA = {
  uc: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "潰瘍性大腸炎",
      diagnosisDate: "2020-06-15",
      diseaseId: "uc",
    },
    timeline: [
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
    ],
    medications: [
      { id: "m1", name: "リアルダ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2023-11-10", endDate: null, isActive: true, changeReason: "1日1回に簡素化のため変更", sideNotes: "食後に服用" },
      { id: "m2", name: "ビオフェルミン", genericName: "", category: "other", dosageForm: "経口", startDate: "2020-06-20", endDate: null, isActive: true, changeReason: "腸内環境の改善", sideNotes: "" },
      { id: "m3", name: "ペンタサ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2020-06-20", endDate: "2023-11-10", isActive: false, changeReason: "初回処方", sideNotes: "1日3回 食後" },
      { id: "m4", name: "プレドニン", genericName: "プレドニゾロン", category: "steroid", dosageForm: "経口", startDate: "2021-03-05", endDate: "2021-08-01", isActive: false, changeReason: "再燃時のステロイドパルス", sideNotes: "30mg→漸減→中止" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-15", values: { crp: 0.12, hb: 14.2, wbc: 5800, alb: 4.1, plt: 22 } },
      { id: "l2", date: "2025-12-10", values: { crp: 0.08, hb: 13.8, wbc: 6200, alb: 4.3, plt: 24 } },
      { id: "l3", date: "2025-09-05", values: { crp: 0.15, hb: 14.0, wbc: 5500, alb: 4.0, plt: 21 } },
      { id: "l4", date: "2025-06-01", values: { crp: 0.45, hb: 12.9, wbc: 7100, alb: 3.8, plt: 28 } },
      { id: "l5", date: "2025-03-01", values: { crp: 0.22, hb: 13.5, wbc: 6000, alb: 4.2, plt: 23 } },
    ],
  },

  parkinson: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "パーキンソン病",
      diagnosisDate: "2019-03-10",
      diseaseId: "parkinson",
    },
    timeline: [
      { id: "ev1", date: "2019-03-10", category: "diagnosis", title: "パーキンソン病と診断", detail: "○○大学病院 神経内科。安静時振戦と動作緩慢を指摘。", source: "manual" },
      { id: "ev2", date: "2019-03-15", category: "medication_change", title: "マドパー処方開始", detail: "レボドパ/ベンセラジド 100mg 1日3回", source: "manual" },
      { id: "ev3", date: "2020-06-01", category: "medication_change", title: "アジレクト追加", detail: "MAO-B阻害薬を併用開始", source: "manual" },
      { id: "ev4", date: "2021-09-20", category: "treatment_change", title: "ウェアリングオフ出現", detail: "レボドパの効果持続時間が短縮。服用間隔を調整。", source: "manual" },
      { id: "ev5", date: "2022-04-10", category: "medication_change", title: "エクフィナ追加", detail: "ウェアリングオフ改善のためMAO-B阻害薬を変更", source: "manual" },
      { id: "ev6", date: "2023-11-15", category: "exam", title: "DATスキャン", detail: "ドパミントランスポーター減少を確認。H&Y分類 Stage 2。", source: "manual" },
      { id: "ev7", date: "2025-01-10", category: "treatment_change", title: "リハビリ開始", detail: "週2回のPT（理学療法）開始。バランス訓練中心。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "マドパー", genericName: "レボドパ/ベンセラジド", category: "levodopa", dosageForm: "経口", startDate: "2019-03-15", endDate: null, isActive: true, changeReason: "初回処方", sideNotes: "食前30分 1日3回" },
      { id: "m2", name: "エクフィナ", genericName: "サフィナミド", category: "mao_b_inhibitor", dosageForm: "経口", startDate: "2022-04-10", endDate: null, isActive: true, changeReason: "ウェアリングオフ対策", sideNotes: "1日1回 朝" },
      { id: "m3", name: "アジレクト", genericName: "ラサギリン", category: "mao_b_inhibitor", dosageForm: "経口", startDate: "2020-06-01", endDate: "2022-04-10", isActive: false, changeReason: "MAO-B阻害薬の併用", sideNotes: "" },
    ],
    labResults: [
      { id: "l1", date: "2026-02-01", values: { tsh: 2.1, ast: 22, alt: 18, bun: 15, cre: 0.9 } },
      { id: "l2", date: "2025-08-01", values: { tsh: 1.8, ast: 25, alt: 20, bun: 16, cre: 0.85 } },
    ],
  },

  sle: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "全身性エリテマトーデス",
      diagnosisDate: "2018-11-20",
      diseaseId: "sle",
    },
    timeline: [
      { id: "ev1", date: "2018-11-20", category: "diagnosis", title: "SLEと診断", detail: "蝶形紅斑・関節痛・抗dsDNA抗体陽性で確定。", source: "manual" },
      { id: "ev2", date: "2018-12-01", category: "medication_change", title: "プレドニン + プラケニル開始", detail: "PSL 30mg + HCQ 200mg", source: "manual" },
      { id: "ev3", date: "2019-06-15", category: "treatment_change", title: "ステロイド漸減", detail: "PSL 30mg→15mg→10mg と段階的に減量", source: "manual" },
      { id: "ev4", date: "2020-03-01", category: "medication_change", title: "セルセプト追加", detail: "ステロイドスペアリング目的でMMF追加", source: "manual" },
      { id: "ev5", date: "2021-08-10", category: "hospitalization", title: "ループス腎炎で入院", detail: "蛋白尿増加。腎生検実施。ISN/RPS Class III。", source: "manual" },
      { id: "ev6", date: "2022-01-01", category: "treatment_change", title: "寛解達成", detail: "SLEDAI 0点。PSL 5mg維持。", source: "manual" },
      { id: "ev7", date: "2024-04-20", category: "exam", title: "定期検査", detail: "抗dsDNA正常化。補体正常範囲。腎機能安定。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "プレドニン", genericName: "プレドニゾロン", category: "steroid", dosageForm: "経口", startDate: "2018-12-01", endDate: null, isActive: true, changeReason: "SLE初回治療", sideNotes: "5mg/日 維持量" },
      { id: "m2", name: "プラケニル", genericName: "ヒドロキシクロロキン", category: "antimalarial", dosageForm: "経口", startDate: "2018-12-01", endDate: null, isActive: true, changeReason: "SLE基本治療", sideNotes: "200mg/日 眼科定期検診" },
      { id: "m3", name: "セルセプト", genericName: "ミコフェノール酸モフェチル", category: "immunosuppressant", dosageForm: "経口", startDate: "2020-03-01", endDate: null, isActive: true, changeReason: "ステロイド減量目的", sideNotes: "1000mg/日 消化器症状に注意" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-01", values: { crp: 0.05, "anti-dsDNA": 12, c3: 95, c4: 22, eGFR: 85, uProtein: 0.1 } },
      { id: "l2", date: "2025-12-01", values: { crp: 0.08, "anti-dsDNA": 15, c3: 90, c4: 20, eGFR: 82, uProtein: 0.12 } },
      { id: "l3", date: "2025-09-01", values: { crp: 0.03, "anti-dsDNA": 10, c3: 98, c4: 24, eGFR: 88, uProtein: 0.08 } },
    ],
  },

  t1d: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "1型糖尿病",
      diagnosisDate: "2015-08-05",
      diseaseId: "t1d",
    },
    timeline: [
      { id: "ev1", date: "2015-08-05", category: "diagnosis", title: "1型糖尿病と診断", detail: "DKA（ケトアシドーシス）で緊急入院。GAD抗体陽性。", source: "manual" },
      { id: "ev2", date: "2015-08-10", category: "medication_change", title: "インスリン療法開始", detail: "MDI（頻回注射法）: ランタス + ノボラピッド", source: "manual" },
      { id: "ev3", date: "2018-04-01", category: "treatment_change", title: "インスリンポンプ導入", detail: "Medtronic 670G SAP療法に移行", source: "manual" },
      { id: "ev4", date: "2021-06-15", category: "treatment_change", title: "CGM導入", detail: "Dexcom G6 開始。リアルタイム血糖モニタリング。", source: "manual" },
      { id: "ev5", date: "2023-09-01", category: "treatment_change", title: "AID（自動インスリン送達）に移行", detail: "Medtronic 780G + Guardian 4。ハイブリッドクローズドループ。", source: "manual" },
      { id: "ev6", date: "2025-04-10", category: "exam", title: "定期検査（眼底・腎機能）", detail: "HbA1c 6.8%。網膜症なし。微量アルブミン尿なし。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "インスリン アスパルト", genericName: "超速効型インスリン", category: "insulin_rapid", dosageForm: "ポンプ", startDate: "2018-04-01", endDate: null, isActive: true, changeReason: "ポンプ用インスリン", sideNotes: "基礎レート+ボーラス" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-01", values: { hba1c: 6.8, eGFR: 95, uAlb: 8, tcho: 185, ldl: 102 } },
      { id: "l2", date: "2025-09-01", values: { hba1c: 7.1, eGFR: 97, uAlb: 5, tcho: 178, ldl: 98 } },
      { id: "l3", date: "2025-03-01", values: { hba1c: 6.9, eGFR: 96, uAlb: 6, tcho: 190, ldl: 105 } },
    ],
  },
};

// ========================================
// データ取得ヘルパー
// ========================================

function getDiseaseId(req) {
  return req.query.disease || req.headers["x-disease-id"] || "uc";
}

function getData(diseaseId) {
  return DEMO_DATA[diseaseId] || DEMO_DATA.uc;
}

function generateSymptomLogs(diseaseId) {
  const logs = [];
  const today = new Date();
  const tmpl = getTemplate(diseaseId);
  const metrics = tmpl?.symptomConfig?.metrics || [];

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (Math.random() > 0.25) {
      const dateStr = d.toISOString().slice(0, 10);
      const log = { id: dateStr, date: dateStr };
      metrics.forEach((m) => {
        if (m.type === "counter") log[m.id] = Math.floor(Math.random() * (m.max > 10 ? 5 : m.max)) + (m.min || 0);
        else if (m.type === "scale") log[m.id] = Math.floor(Math.random() * (m.max - m.min + 1)) + m.min;
        else if (m.type === "toggle") log[m.id] = Math.random() < 0.12;
      });
      logs.push(log);
    }
  }
  return logs;
}

const symptomCache = {};
function getSymptomLogs(diseaseId) {
  if (!symptomCache[diseaseId]) symptomCache[diseaseId] = generateSymptomLogs(diseaseId);
  return symptomCache[diseaseId];
}

// ========================================
// API エンドポイント
// ========================================

// プロフィール
router.get("/api/profile", (req, res) => res.json(getData(getDiseaseId(req)).profile));
router.put("/api/profile", (req, res) => res.json({ ...getData(getDiseaseId(req)).profile, ...req.body }));

// タイムライン
router.get("/api/timeline", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json([...data.timeline].sort((a, b) => b.date.localeCompare(a.date)));
});
router.post("/api/timeline", (req, res) => {
  const data = getData(getDiseaseId(req));
  const ev = { id: "ev" + Date.now(), ...req.body, source: "manual" };
  data.timeline.push(ev);
  res.status(201).json(ev);
});
router.put("/api/timeline/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.timeline.findIndex((e) => e.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  Object.assign(data.timeline[idx], req.body);
  res.json(data.timeline[idx]);
});
router.delete("/api/timeline/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.timeline.findIndex((e) => e.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  data.timeline.splice(idx, 1);
  res.json({ deleted: true });
});

// 薬管理
router.get("/api/medications", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json([...data.medications].sort((a, b) => b.startDate.localeCompare(a.startDate)));
});
router.get("/api/medications/active", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json(data.medications.filter((m) => m.isActive));
});
router.post("/api/medications", (req, res) => {
  const data = getData(getDiseaseId(req));
  const med = { id: "m" + Date.now(), ...req.body, isActive: !req.body.endDate };
  data.medications.push(med);
  res.status(201).json(med);
});
router.put("/api/medications/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.medications.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  Object.assign(data.medications[idx], req.body);
  if (req.body.endDate !== undefined) data.medications[idx].isActive = !req.body.endDate;
  res.json(data.medications[idx]);
});
router.delete("/api/medications/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.medications.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  data.medications.splice(idx, 1);
  res.json({ deleted: true });
});

// 症状記録
router.get("/api/symptoms", (req, res) => {
  const diseaseId = getDiseaseId(req);
  const days = parseInt(req.query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  const logs = getSymptomLogs(diseaseId).filter((l) => l.date >= sinceStr);
  res.json(logs.sort((a, b) => b.date.localeCompare(a.date)));
});
router.get("/api/symptoms/today", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const log = getSymptomLogs(getDiseaseId(req)).find((l) => l.date === today);
  res.json(log || null);
});
router.post("/api/symptoms", (req, res) => {
  const diseaseId = getDiseaseId(req);
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const logs = getSymptomLogs(diseaseId);
  const existing = logs.findIndex((l) => l.date === date);
  const log = { id: date, ...req.body, date };
  if (existing >= 0) logs[existing] = log;
  else logs.push(log);
  res.status(201).json(log);
});
router.delete("/api/symptoms/:date", (req, res) => {
  const logs = getSymptomLogs(getDiseaseId(req));
  const idx = logs.findIndex((l) => l.date === req.params.date);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  logs.splice(idx, 1);
  res.json({ deleted: true });
});

// 検査値
router.get("/api/labs", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json(data.labResults || []);
});
router.post("/api/labs", (req, res) => {
  const data = getData(getDiseaseId(req));
  const entry = { id: "l" + Date.now(), ...req.body };
  if (!data.labResults) data.labResults = [];
  data.labResults.unshift(entry);
  res.status(201).json(entry);
});

// サマリー
router.get("/api/summary", (req, res) => {
  const diseaseId = getDiseaseId(req);
  const data = getData(diseaseId);
  const tmpl = getTemplate(diseaseId);
  const active = data.medications.filter((m) => m.isActive);
  const recent = [...data.timeline].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().slice(0, 10);
  const logs = getSymptomLogs(diseaseId).filter((l) => l.date >= sinceStr);

  let symptomSummary = null;
  if (logs.length > 0 && tmpl?.symptomConfig?.summaryMetrics) {
    symptomSummary = { recordedDays: logs.length, metrics: {} };
    tmpl.symptomConfig.summaryMetrics.forEach((sm) => {
      if (sm.aggregate === "avg") {
        const vals = logs.map((l) => l[sm.id]).filter((v) => v != null);
        symptomSummary.metrics[sm.id] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
      } else if (sm.aggregate === "countTrue") {
        symptomSummary.metrics[sm.id] = logs.filter((l) => l[sm.id]).length;
      }
    });
  }

  res.json({
    profile: data.profile,
    activeMedications: active,
    recentEvents: recent,
    symptomSummary,
    labResults: (data.labResults || []).slice(0, 3),
  });
});

// ヘルスチェック
router.get("/health", (_req, res) => res.json({ status: "ok", mode: "demo" }));

module.exports = router;
