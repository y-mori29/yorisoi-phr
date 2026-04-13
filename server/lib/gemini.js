const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * AIの役割を限定する共通システムプロンプト
 * - 診断・重症度判定・解釈は一切禁止
 * - 与えられた情報の転記のみ
 */
const SAFETY_SYSTEM_INSTRUCTION = `あなたは患者の入力を補助するAIです。

【厳守事項】
1. 診断・重症度判定・治療方針の示唆は絶対にしないこと
2. 医学的解釈・コメント・警告・アドバイスは一切出力しないこと
3. 患者の発話/写真から読み取れる情報のみを、指定されたフィールドに転記すること
4. 不明・読み取れない項目は null を返すこと
5. 推測で値を埋めないこと
6. 出力は必ず指定されたJSON形式のみ。説明文・前置き・断り書きは一切不要
7. 「基準値を超えている」「注意が必要」などの評価表現は絶対に使わないこと

あなたは医師ではなく、データ入力の代筆者です。`;

/** テキスト入力用モデル（軽量・速い） */
function getTextModel() {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SAFETY_SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });
}

/** Vision（画像）入力用モデル */
function getVisionModel() {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SAFETY_SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });
}

/** チャット用モデル（temperatureやや高め） */
function getChatModel() {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SAFETY_SYSTEM_INSTRUCTION +
      "\n\n対話型で症状を聞き取る場合は、短く優しい質問を1つずつ投げてください。最後に `finished: true` をレスポンスJSONに含めて完了を伝えます。",
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });
}

/**
 * JSONパースのエラー耐性処理（コードフェンスや前置き付きにも対応）
 */
function parseJsonSafe(text) {
  if (!text) return null;
  // コードフェンス除去
  let cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/g, "").trim();
  // 先頭のJSONだけを抽出
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON parse error:", e, "\nText:", text);
    return null;
  }
}

/**
 * Base64 データ URI を Gemini API の inlineData 形式に変換
 */
function dataUriToInlineData(dataUri) {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URI");
  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

module.exports = {
  genAI,
  getTextModel,
  getVisionModel,
  getChatModel,
  parseJsonSafe,
  dataUriToInlineData,
  hasApiKey: () => !!API_KEY,
};
