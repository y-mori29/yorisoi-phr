# よりそい PHR

潰瘍性大腸炎（UC）患者向けの治療歴・薬情報管理サービス。
「よりそい」LINE診察サポートの拡張機能として、患者が自分の治療経歴を「医療パスポート」として管理し、診察時に医師へ提示できるようにする。

## 機能一覧

| 機能 | 説明 | 画面 |
|------|------|------|
| **治療タイムライン** | 診断・入院・薬変更・検査などを年表形式で管理 | `timeline.html` |
| **おくすり管理** | UC薬剤マスタ（19種）から選択式で処方薬を管理 | `medications.html` |
| **症状きろく** | 排便回数・ブリストルスケール・血便・痛みをワンタップ記録 | `symptom-log.html` |
| **トイレさがし** | Google Maps + Places APIで近くのトイレを検索 | `restroom.html` |
| **診察用サマリー** | 処方薬・症状統計・治療歴を1画面に集約（医師に見せる用） | `summary.html` |

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | LIFF（LINE Front-end Framework）+ Vanilla JS |
| バックエンド | Node.js 18 + Express |
| データストア | Cloud Firestore |
| 認証 | LIFF IDトークン → LINE UserID |
| インフラ | Google Cloud Run |
| 地図（トイレ検索） | Google Maps JavaScript API + Places API |

## プロジェクト構成

```
yorisoi-phr/
├── server/                         ← バックエンド
│   ├── index.js                    ← Express サーバー（デモ/本番自動切替）
│   ├── middleware/auth.js          ← LIFF IDトークン検証
│   ├── lib/firestore.js            ← Firestore クライアント
│   └── routes/
│       ├── profile.js              ← プロフィール API
│       ├── timeline.js             ← タイムライン CRUD
│       ├── medications.js          ← 薬管理 CRUD
│       ├── symptoms.js             ← 症状記録 CRUD
│       ├── summary.js              ← 診察用サマリー
│       └── demo.js                 ← デモモード用モックAPI
├── public/                         ← LIFF フロントエンド（9画面）
│   ├── index.html                  ← メニュー
│   ├── timeline.html               ← タイムライン表示
│   ├── timeline-edit.html          ← イベント追加/編集
│   ├── medications.html            ← 薬一覧
│   ├── medication-edit.html        ← 薬追加/編集（マスタ選択式）
│   ├── symptom-log.html            ← 症状記録（カレンダー/リスト）
│   ├── symptom-entry.html          ← 症状入力（ワンタップUI）
│   ├── restroom.html               ← トイレ検索（地図）
│   ├── summary.html                ← 診察用サマリー
│   ├── css/style.css               ← 共通スタイル
│   └── js/liff-init.js             ← LIFF初期化 + API共通ヘルパー
├── data/
│   └── medication-master.json      ← UC薬剤マスタ（19薬剤/6カテゴリ）
├── docs/
│   └── requirements_yorisoi_uc.md  ← 要件定義書
├── firestore.rules                 ← Firestore セキュリティルール
├── Dockerfile                      ← Cloud Run デプロイ用
├── .env.example                    ← 環境変数テンプレート
└── package.json
```

## セットアップ

### デモモード（Firestore不要）

```bash
npm install
npm run dev
# http://localhost:8080 でデモデータ付きで動作
```

GOOGLE_CLOUD_PROJECT が未設定の場合、自動的にデモモードで起動します。
サンプルの治療歴・薬情報・症状データが表示されます。

### 本番モード

```bash
# 環境変数を設定
cp .env.example .env
# .env を編集: GOOGLE_CLOUD_PROJECT, LIFF_CHANNEL_ID を設定

# Firestore の有効化
# GCP コンソールで Cloud Firestore を作成

# LIFF の設定
# LINE Developers で LIFF アプリを作成し、public/js/liff-init.js の LIFF_ID を更新

npm install
npm start
```

### Cloud Run デプロイ

```bash
gcloud run deploy yorisoi-phr \
  --source . \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars=GOOGLE_CLOUD_PROJECT=your-project,LIFF_CHANNEL_ID=your-channel-id
```

## Firestore コレクション設計

```
users/{lineUserId}/
  ├── profile                        ← ユーザー基本情報
  ├── timeline_events/{eventId}      ← 治療タイムライン
  ├── medications/{medicationId}     ← 薬情報
  └── symptom_logs/{date}            ← 症状日次記録（日付がID）
```

## ライセンス

Private - 株式会社メディキャンバス
