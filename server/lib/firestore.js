const { Firestore } = require("@google-cloud/firestore");

const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

/** ユーザードキュメントのルートパスを返す */
function userRef(lineUserId) {
  return db.collection("users").doc(lineUserId);
}

module.exports = { db, userRef };
