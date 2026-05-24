# Claude Code への初期指示書

このファイルをプロジェクトルートに置き、Claude Code を起動するときにこの指示を使ってください。

---

## 🎯 あなたのミッション

**BSKY-GP（Bluesky Grand Prix）** という、Bluesky のフォロワーを「30日間でどれだけ増やせるか」を競う Web サービスを、一から完全に構築します。

**プロジェクトフォルダ構成（モノレポ）:**
```
my-bsky-gp-repo/
├── docs/
│   └── BSKY-GP_仕様書.md          ← この指示の詳細仕様書
├── apps/
│   ├── web/                       # Next.js (Vercel)
│   └── feed-generator/            # Cloudflare Workers
├── packages/
│   └── db/                        # Drizzle ORM スキーマ（共通）
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 📋 重要な守るべきルール

### 1. 仕様書を絶対の源泉に
- `docs/BSKY-GP_仕様書.md` をいつも参照して、その通りに実装する
- 不明な点や矛盾を見つけたら、私に聞いてから進める
- 仕様書の「セクション○○」と言われたら、該当部分を読み直す

### 2. 技術スタック（守ること）
- **フレームワーク:** Next.js（App Router）+ TypeScript + Tailwind CSS
- **DB:** Neon Postgres（Drizzle ORM 経由）
- **認証:** AT Protocol OAuth（`@atproto/oauth-client-node`）
- **UI コンポーネント:** shadcn/ui（ベース）+ Magic UI / Aceternity UI（`next/dynamic` で遅延読み込み）
- **ORM:** Drizzle ORM（Vercel・Cloudflare Workers 両対応）
- **ホスティング:** Vercel（Next.js）+ Cloudflare Workers（Feed Generator）
- **多言語:** next-intl（6言語対応）

### 3. 無料枠の制約を厳密に守る
- Vercel: 関数呼び出し 10万回/月、帯域 100GB/月、Cron は 1日1回のみ
- Neon: HTTP ドライバー（`drizzle-orm/neon-http`）を使う、WebSocket 接続は使わない
- Cloudflare Workers: Feed Generator は絶対に Vercel で動かさない（リクエスト爆死するため）

### 4. パフォーマンスと SEO を意識する
- 画像は `next/image`、フォントは `next/font` で最適化
- Magic UI などの重い JS ライブラリは `next/dynamic` で遅延読み込み
- ランキング・殿堂ページは SSR または ISR で、クローラーが確実にテキストを読める
- hreflang（多言語タグ）を全ページに設定

### 5. セキュリティと正確性
- すべてのユーザー入力はサーバー側で検証する
- Bluesky ハンドル変更対策: 認証・API には常に DID を使い、`handle` / `display_name` は毎回 API で最新化する
- Cron 堅牢化: アクティブユーザーのみ対象、未処理分を次回に引き継ぎ、Lazy Fetch でセーフティネット

---

## 🚀 実装の優先順位（セクション 18 参照）

このコマンドで開始：
```bash
pnpm init -y
pnpm install -w
cd apps && mkdir web feed-generator
cd ../packages && mkdir db
```

その後、**以下の順番で実装してください。各段階で動作確認します。**

1. **プロジェクト基盤** — Next.js + TypeScript + Tailwind + Neon 接続 + Drizzle スキーマ
2. **Bluesky OAuth 認証フロー** — ログイン・ユーザー確認
3. **参加登録 + baseline 記録 + クラス判定** — 登録時のフォロワー数でクラスを確定
4. **フォロワー数記録** — Cron（1日1回）+ Lazy Fetch のハイブリッド、Exponential Backoff 込み
5. **ランキング集計ロジック** — 日 / 週 / 月、総合 + クラス別、周辺ランキング
6. **トップページ UI** — Bento Grid、ランキング、グラフ、デッドヒート枠
7. **マイページ / 個人ページ** — 退会・データ削除導線を含む
8. **プロフィールカード + OGP 画像生成 + シェア** — Bluesky Intent URL 込み
9. **スパム・不正検知 + 運営用 Ban 機能**
10. **マイルストーン通知・達成演出**
11. **多言語対応** — 6言語（ja / en / pt-BR / zh-TW / de / fr）
12. **殿堂ページ + 年間チャンピオン集計**
13. **Cloudflare Workers でカスタムフィード**（Feed Generator）
14. **SEO 対策** — メタデータ、sitemap/robots、hreflang、OGP、SSR/ISR、JSON-LD、Core Web Vitals
15. **プライバシーポリシー、寄付リンク、404、最終調整**

---

## 💬 質問・判断が必要なときの対応

- **不明な点:** 「セクション〇について質問があります。...」と聞いてください
- **実装の判断:** 「セクション〇を実装する際に、×× はどうしたらいいですか？」と聞いてください
- **仕様の矛盾を見つけた:** 「セクション〇とセクション△で矛盾があると思います」と指摘してください

---

## 🛠️ 推奨開発ツール・リソース

- **UI:** shadcn/ui（https://ui.shadcn.com）、Magic UI（https://magicui.design）、Aceternity UI（https://ui.aceternity.com）
- **ORM:** Drizzle ORM（https://orm.drizzle.team）
- **OGP テスト:** opengraph.xyz（https://www.opengraph.xyz）+ ngrok
- **翻訳ファイル:** v0.dev（https://v0.dev）で 6言語分を一括生成

---

## 📍 スタート地点

次のメッセージで、以下を指示してください：

> 「BSKY-GP を開発します。仕様書は `docs/BSKY-GP_仕様書.md` です。セクション 18 の優先順位に従い、まず『プロジェクト基盤』（優先順位 1）を実装してください。pnpm workspaces のモノレポ構成で、以下を用意してください：
> - `apps/web` に Next.js（App Router、TypeScript、Tailwind CSS）のプロジェクト
> - `apps/feed-generator` に Cloudflare Workers のプロジェクト
> - `packages/db` に Drizzle ORM のスキーマ定義
> - Neon Postgres への接続確認
> 
> 完成後、状況報告してください。」

---

## 🎬 Good luck, Grand Prix! 🏁
