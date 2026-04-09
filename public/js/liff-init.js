/**
 * LIFF 初期化 & 認証ヘルパー
 * ブラウザ直接アクセス時はデモモードで動作する
 */

const LIFF_ID = "YOUR_LIFF_ID"; // デプロイ時に設定
const API_BASE = ""; // 同一オリジン

let _idToken = null;
let _userId = null;
let _isDemoMode = false;

/**
 * LIFF を初期化。LIFF SDK が無い場合はデモモードにフォールバック。
 */
async function initLiff() {
  // LIFF SDK が読み込まれていない or LIFF_ID未設定 → デモモード
  if (typeof liff === "undefined" || LIFF_ID === "YOUR_LIFF_ID") {
    console.info("[DEV] LIFF unavailable — running in demo mode");
    _isDemoMode = true;
    _idToken = "demo-token";
    _userId = "demo-user";
    return { idToken: _idToken, userId: _userId, profile: { displayName: "デモユーザー" } };
  }

  await liff.init({ liffId: LIFF_ID });

  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  _idToken = liff.getIDToken();
  const profile = await liff.getProfile();
  _userId = profile.userId;

  return { idToken: _idToken, userId: _userId, profile };
}

/**
 * 認証付き API リクエスト
 */
async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${_idToken}`,
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}

/** GET リクエスト */
function apiGet(path) {
  return apiFetch(path);
}

/** POST リクエスト */
function apiPost(path, data) {
  return apiFetch(path, { method: "POST", body: JSON.stringify(data) });
}

/** PUT リクエスト */
function apiPut(path, data) {
  return apiFetch(path, { method: "PUT", body: JSON.stringify(data) });
}

/** DELETE リクエスト */
function apiDelete(path) {
  return apiFetch(path, { method: "DELETE" });
}

/**
 * 日付を表示用に整形 (YYYY-MM-DD → YYYY年M月D日)
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 日付を年月のみ表示 (YYYY-MM-DD → YYYY年M月)
 */
function formatYearMonth(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/**
 * カテゴリの日本語ラベル
 */
const CATEGORY_LABELS = {
  diagnosis: "診断",
  hospitalization: "入院",
  medication_change: "薬変更",
  exam: "検査",
  treatment_change: "治療方針変更",
  other: "その他",
};

const MED_CATEGORY_LABELS = {
  "5-ASA": "5-ASA製剤",
  steroid: "ステロイド",
  immunomodulator: "免疫調節薬",
  biologic: "生物学的製剤",
  jak_inhibitor: "JAK阻害薬",
  other: "その他",
};

/**
 * ローディング表示の切り替え
 */
function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p class="mt-8 text-sm text-muted">読み込み中...</p>
      </div>`;
  }
}
