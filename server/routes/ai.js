/**
 * AI入力補助APIルート
 * - 診断・判定は一切行わない
 * - 入力補助（転記）のみ
 */

const express = require("express");
const { getTextModel, getVisionModel, getChatModel, parseJsonSafe, dataUriToInlineData, hasApiKey } = require("../lib/gemini");
const { getTemplate, getMedicationMaster } = require("../lib/templates");

const router = express.Router();

// ミドルウェア: APIキーの有無確認
router.use((req, res, next) => {
  if (!hasApiKey()) {
    return res.status(503).json({ error: "Gemini API key not configured" });
  }
  next();
});

// Express の JSON サイズ上限を上げる（画像アップロード用）
router.use(express.json({ limit: "15mb" }));

// ======================================================
// POST /api/ai/parse-symptom
// 音声入力されたテキストを、疾患テンプレートのmetricsにマップする
// ======================================================
router.post("/parse-symptom", async (req, res) => {
  try {
    const { text, diseaseId } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });

    const tmpl = getTemplate(diseaseId || "uc");
    if (!tmpl) return res.status(404).json({ error: "Template not found" });

    const metrics = tmpl.symptomConfig?.metrics || [];
    const fieldDescriptions = metrics.map((m) => {
      let desc = `- ${m.id} (${m.label})`;
      if (m.type === "counter") desc += ` : 数値 ${m.min}〜${m.max}${m.unit ? " " + m.unit : ""}`;
      if (m.type === "scale") desc += ` : ${m.min}〜${m.max}の段階${m.labels ? " (" + m.labels.join("/") + ")" : ""}`;
      if (m.type === "toggle") desc += ` : true か false`;
      if (m.description) desc += ` — ${m.description}`;
      return desc;
    }).join("\n");

    const prompt = `次の患者の発話を、指定されたフィールドに転記してください。

【患者の発話】
${text}

【転記先フィールド】
${fieldDescriptions}

【出力形式】
以下のJSON形式のみで出力。発話に含まれない項目は null を返す。

{
${metrics.map((m) => `  "${m.id}": <値 or null>`).join(",\n")},
  "memo": "<発話のうちフィールドに該当しない自由記述があれば転記、なければ null>"
}

【注意】
- 推測や補完はしない
- 医学的解釈・評価コメントは一切加えない
- 「痛み2くらい」なら painScore: 2、明言されなければ null`;

    const model = getTextModel();
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // サニタイズ: テンプレートにあるフィールドのみ返す
    const sanitized = { memo: parsed.memo || null };
    metrics.forEach((m) => {
      if (parsed[m.id] !== undefined && parsed[m.id] !== null) {
        sanitized[m.id] = parsed[m.id];
      }
    });

    res.json({ result: sanitized, raw: parsed });
  } catch (err) {
    console.error("parse-symptom error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/chat-symptom
// 対話型で症状を聞き取る
// body: { messages: [{role, content}...], diseaseId }
// ======================================================
router.post("/chat-symptom", async (req, res) => {
  try {
    const { messages = [], diseaseId } = req.body;
    const tmpl = getTemplate(diseaseId || "uc");
    if (!tmpl) return res.status(404).json({ error: "Template not found" });

    const metrics = tmpl.symptomConfig?.metrics || [];
    const fieldsDesc = metrics.map((m) => `${m.id}(${m.label}, ${m.type})`).join(", ");

    const systemContext = `あなたは${tmpl.name}の患者から今日の症状を聞き取る優しい対話AIです。

収集したいフィールド: ${fieldsDesc}

【進行ルール】
1. まだ埋まっていないフィールドについて、1回に1〜2問だけ短く聞く
2. 患者の回答から読み取れる値をメモしていく
3. すべてのフィールドが埋まったか、患者が「これで終わり」と言ったら finished: true にする
4. 診断・評価・アドバイスは絶対にしない。共感の一言と次の質問だけ
5. 質問は親しみやすい口調で
6. 聞き取った値は collected に格納する

【出力形式 JSON】
{
  "reply": "<次の質問または完了メッセージ>",
  "collected": {
    "<fieldId>": <値 or null>, ...
  },
  "finished": <true or false>
}`;

    // チャット履歴を構築
    const history = [];
    history.push({ role: "user", parts: [{ text: systemContext }] });
    history.push({ role: "model", parts: [{ text: '{"reply":"こんにちは。今日の体調を一緒に記録しましょう。排便の回数から教えてください。","collected":{},"finished":false}' }] });

    messages.forEach((m) => {
      history.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    });

    const model = getChatModel();
    const chat = model.startChat({ history: history.slice(0, -1) });
    const lastMessage = history[history.length - 1];
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // collected のサニタイズ
    const collected = {};
    const validIds = new Set(metrics.map((m) => m.id));
    Object.keys(parsed.collected || {}).forEach((k) => {
      if (validIds.has(k) && parsed.collected[k] !== null && parsed.collected[k] !== undefined) {
        collected[k] = parsed.collected[k];
      }
    });

    res.json({
      reply: parsed.reply || "...",
      collected,
      finished: !!parsed.finished,
    });
  } catch (err) {
    console.error("chat-symptom error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/scan-medication
// お薬手帳の写真から薬を抽出
// body: { image: "data:image/...", diseaseId }
// ======================================================
router.post("/scan-medication", async (req, res) => {
  try {
    const { image, diseaseId } = req.body;
    if (!image) return res.status(400).json({ error: "image required" });

    const master = getMedicationMaster(diseaseId || "uc");
    const masterNames = master ? master.medications.map((m) => ({ brandNames: m.brandNames, generic: m.genericName, category: m.category })) : [];

    const prompt = `お薬手帳または処方箋の画像を読み取り、処方された薬の情報を転記してください。

【出力形式 JSON】
{
  "medications": [
    {
      "brandName": "<商品名>",
      "genericName": "<一般名 or null>",
      "dosage": "<用量（例: 100mg）or null>",
      "frequency": "<用法（例: 1日3回食後）or null>",
      "startDate": "<開始日 YYYY-MM-DD or null>"
    }, ...
  ]
}

【注意】
- 読み取れた薬のみ列挙（推測不可）
- 薬効・相互作用・副作用等のコメントは一切含めない
- 単なる転記のみ`;

    const imagePart = dataUriToInlineData(image);
    const model = getVisionModel();
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed || !Array.isArray(parsed.medications)) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // 薬剤マスタと照合してcategoryを推定
    const enriched = parsed.medications.map((m) => {
      const found = masterNames.find((mm) =>
        mm.brandNames.some((bn) => m.brandName && m.brandName.includes(bn))
      );
      return {
        ...m,
        category: found ? found.category : "other",
        matchedInMaster: !!found,
      };
    });

    res.json({ medications: enriched });
  } catch (err) {
    console.error("scan-medication error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/scan-lab
// 検査結果の写真/PDFから数値を抽出
// body: { image: "data:image/...", diseaseId }
// ======================================================
router.post("/scan-lab", async (req, res) => {
  try {
    const { image, diseaseId } = req.body;
    if (!image) return res.status(400).json({ error: "image required" });

    const tmpl = getTemplate(diseaseId || "uc");
    if (!tmpl) return res.status(404).json({ error: "Template not found" });

    const labItems = tmpl.labConfig?.items || [];
    const itemsDesc = labItems.map((l) => `- ${l.id} (${l.label}, ${l.unit})`).join("\n");

    const prompt = `検査結果の画像を読み取り、指定された検査項目の数値を転記してください。

【抽出対象】
${itemsDesc}

【出力形式 JSON】
{
  "date": "<検査日 YYYY-MM-DD or null>",
  "values": {
${labItems.map((l) => `    "${l.id}": <数値 or null>`).join(",\n")}
  }
}

【注意】
- 画像から読み取れた数値のみ
- 基準値範囲内外の判定コメントは一切含めない
- 単位換算は行わない（画像のままの値）`;

    const imagePart = dataUriToInlineData(image);
    const model = getVisionModel();
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // サニタイズ
    const cleanValues = {};
    labItems.forEach((item) => {
      const v = parsed.values?.[item.id];
      if (v !== null && v !== undefined && !isNaN(parseFloat(v))) {
        cleanValues[item.id] = parseFloat(v);
      }
    });

    res.json({ date: parsed.date || null, values: cleanValues });
  } catch (err) {
    console.error("scan-lab error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/scan-cgm
// CGMレポートのスクリーンショットから血糖指標を抽出
// body: { image: "data:image/..." }
// ======================================================
router.post("/scan-cgm", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "image required" });

    const prompt = `CGM（持続血糖モニタリング）レポート画像から数値指標を読み取り、転記してください。

【抽出対象】
- tir: Time in Range (70-180 mg/dL) の % (0-100)
- tbr_l2: TBR Level 2 (<54 mg/dL) の % (0-100)
- tar_l1: TAR (>180 mg/dL) の %
- cv: 変動係数 %
- gmi: Glucose Management Indicator %
- tdd: Total Daily Dose (単位/日)

【出力形式 JSON】
{
  "tir": <数値 or null>,
  "tbr_l2": <数値 or null>,
  "tar_l1": <数値 or null>,
  "cv": <数値 or null>,
  "gmi": <数値 or null>,
  "tdd": <数値 or null>
}

【注意】
- 画像から読み取れた値のみ（推測不可）
- 血糖管理の良し悪しに関するコメントは一切含めない
- 数値の転記のみ`;

    const imagePart = dataUriToInlineData(image);
    const model = getVisionModel();
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // サニタイズ
    const keys = ["tir", "tbr_l2", "tar_l1", "cv", "gmi", "tdd"];
    const clean = {};
    keys.forEach((k) => {
      if (parsed[k] !== null && parsed[k] !== undefined && !isNaN(parseFloat(parsed[k]))) {
        clean[k] = parseFloat(parsed[k]);
      }
    });

    res.json({ values: clean });
  } catch (err) {
    console.error("scan-cgm error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ヘルスチェック
router.get("/health", (_req, res) => res.json({ ok: true, hasKey: hasApiKey() }));

module.exports = router;
