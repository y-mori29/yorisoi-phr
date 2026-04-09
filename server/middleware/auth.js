/**
 * LIFF IDトークン検証ミドルウェア
 *
 * フロントエンドから送られる Authorization: Bearer {idToken} を
 * LINE の /oauth2/v2.1/verify エンドポイントで検証し、
 * req.lineUserId にユーザーIDをセットする。
 */

const CHANNEL_ID = process.env.LIFF_CHANNEL_ID;

async function verifyLiffToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const idToken = auth.slice(7);

  // 開発モード: DEV_USER_ID が設定されている場合はトークン検証をスキップ
  if (process.env.DEV_USER_ID) {
    req.lineUserId = process.env.DEV_USER_ID;
    return next();
  }

  try {
    const resp = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: CHANNEL_ID,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error("LIFF token verify failed:", resp.status, body);
      return res.status(401).json({ error: "Invalid token" });
    }

    const payload = await resp.json();
    req.lineUserId = payload.sub; // LINE UserID
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
}

module.exports = { verifyLiffToken };
