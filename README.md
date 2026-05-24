# BSKY-GP 🏎️ Bluesky Grand Prix

30日間でBlueskyのフォロワーをどれだけ増やせるかを競うグローバルコンペティション。

## アーキテクチャ

| レイヤー | 技術スタック | ホスティング |
|--------|------------|------------|
| Web フロントエンド + API | Next.js 16 (App Router) | Vercel |
| Feed Generator | Cloudflare Workers | Cloudflare |
| データベース | Neon Postgres (HTTP driver) | Neon |
| ORM | Drizzle ORM | — |
| 認証 | AT Protocol OAuth | — |
| 国際化 | next-intl (ja / en / pt-BR / zh-TW / de / fr) | — |

```
my-bsky-gp-repo/
├── apps/
│   ├── web/              # Next.js (App Router) → Vercel
│   └── feed-generator/   # Cloudflare Workers (AT Protocol Feed Generator)
├── packages/
│   └── db/               # Drizzle ORM スキーマ共有パッケージ
├── docs/
│   └── BSKY-GP_仕様書.md
└── README.md
```

## 前提条件

- Node.js 20+
- pnpm 9+
- [Neon](https://neon.tech) アカウント（無料枠で可）
- [Vercel](https://vercel.com) アカウント（無料枠で可）
- [Cloudflare](https://cloudflare.com) アカウント（Feed Generator 用、無料枠で可）

---

## ローカル開発

### 1. 依存関係インストール

```bash
git clone <repo-url>
cd my-bsky-gp-repo
pnpm install
```

### 2. 環境変数の設定

```bash
cp apps/web/.env.example apps/web/.env.local
# .env.local を開いて各値を設定（コメントを参照）
```

主要な変数：

| 変数名 | 説明 |
|------|----|
| `DATABASE_URL` | Neon 接続文字列（Pooled モード推奨）|
| `SESSION_SECRET` | セッション Cookie の署名鍵（32文字以上のランダム文字列）|
| `ADMIN_SECRET` | 管理者 API の Bearer トークン |
| `CRON_SECRET` | Vercel Cron ジョブの認証トークン |
| `SEASON_START_DATE` | シーズン開始日（例: `2026-07-01`）|
| `NEXT_PUBLIC_SITE_URL` | 公開 URL（ローカルは `http://localhost:3000`）|

### 3. データベースのセットアップ

[Neon Console](https://console.neon.tech) でプロジェクト作成後：

```bash
# スキーマを Neon に適用（初回・変更時）
cd packages/db
pnpm generate   # migration ファイルを生成
pnpm migrate    # Neon に適用
```

### 4. 開発サーバー起動

```bash
# Web アプリ (http://localhost:3000)
pnpm dev:web

# Feed Generator (http://localhost:8787)
pnpm dev:feed
```

### 5. ヘルスチェック

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","db":"connected"}
```

---

## 本番デプロイ

### Vercel (apps/web)

```bash
# Vercel CLI でデプロイ
vercel --cwd apps/web --prod

# または GitHub 連携で自動デプロイ（推奨）
```

Vercel ダッシュボード → Settings → Environment Variables に以下を登録：

| 変数名 | 種別 |
|------|------|
| `DATABASE_URL` | Secret |
| `SESSION_SECRET` | Secret |
| `ADMIN_SECRET` | Secret |
| `CRON_SECRET` | Secret |
| `SEASON_START_DATE` | Plain |
| `NEXT_PUBLIC_SITE_URL` | Plain |
| `NEXT_PUBLIC_DEVELOPER_HANDLE` | Plain |

**Cron ジョブ：** `vercel.json` で毎日 UTC 1:00 に自動実行されます。

### Cloudflare Workers (apps/feed-generator)

```bash
cd apps/feed-generator

# DATABASE_URL をシークレットとして登録（初回のみ）
pnpm wrangler secret put DATABASE_URL

# デプロイ
pnpm deploy
```

`wrangler.toml` の `FEED_DID` と `FEED_HOSTNAME` を実際のドメインに変更してください。

---

## Feed Generator の Bluesky 登録

デプロイ後、DID ドキュメントの確認：

```bash
curl https://feed.bsky-gp.vercel.app/.well-known/did.json
```

Bluesky クライアントで以下のフィード URI を追加：

```
at://did:web:feed.bsky-gp.vercel.app/app.bsky.feed.generator/bsky-gp
```

---

## 管理者機能

```bash
# 要確認（スパム疑い）エントリー一覧
curl https://bsky-gp.vercel.app/api/admin/flagged \
  -H "Authorization: Bearer $ADMIN_SECRET"

# エントリーを Ban
curl -X PATCH https://bsky-gp.vercel.app/api/admin/entries/123/ban \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

---

## シーズンチャンピオンの確定

シーズン終了後に `decideChampions(season)` を呼び出して確定させます：

```typescript
// packages/db を使って直接実行
import { decideChampions } from './apps/web/src/lib/champions';
await decideChampions(1); // season 番号を指定
```

確定後は `/hall-of-fame` に自動表示されます。

---

## SEO / サイトマップ

| URL | 説明 |
|-----|------|
| `/sitemap.xml` | 動的生成（参加者ページ含む、1時間 ISR）|
| `/robots.txt` | API・ダッシュボードを Disallow |

---

## 対応言語

| 言語 | コード | ファイル |
|-----|-------|--------|
| 日本語 | `ja` | `apps/web/messages/ja.json` |
| English | `en` | `apps/web/messages/en.json` |
| Português (BR) | `pt-BR` | `apps/web/messages/pt-BR.json` |
| 繁體中文 | `zh-TW` | `apps/web/messages/zh-TW.json` |
| Deutsch | `de` | `apps/web/messages/de.json` |
| Français | `fr` | `apps/web/messages/fr.json` |

---

## ライセンス

MIT
