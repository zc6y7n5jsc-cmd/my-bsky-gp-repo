# BSKY-GP 開発仕様書

> **このドキュメントについて**
> Bluesky のフォロワー増加数を競う Web サービス「BSKY-GP」の完全仕様書です。
> Claude Code にこのファイルを渡して開発を進めることを想定しています。
> ハッシュタグ: `#BSKY_GP`

---

## 1. プロジェクト概要

**BSKY-GP（Bluesky Grand Prix）** は、Bluesky のフォロワーを
「30日間でどれだけ増やせるか」を競うグローバルな Web サービス。

- 参加は各自のタイミングで自由（一斉スタートではない）
- 参加した瞬間がその人のスタート地点、そこから30日間が勝負期間
- 日 / 週 / 月の3種類のランキングと、登録時フォロワー数によるクラス別ランキング
- 年度ごとにクラス別の年間チャンピオンを決定し、殿堂に記録
- グローバル展開のため6言語対応
- F1 のグランプリのような「イベント感」「お祭り感」を演出する

---

## 2. 技術スタック

| 項目 | 採用技術 |
|------|----------|
| フレームワーク | Next.js（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| UIコンポーネント | shadcn/ui（ベース）+ Magic UI / Aceternity UI（アニメーション）|
| データベース | Neon（Serverless Postgres） |
| ホスティング | Vercel（Hobby / 無料プラン） |
| 認証 | AT Protocol OAuth（`@atproto/oauth-client-node`） |
| フォロワー数取得 | Bluesky 公開 API（`app.bsky.actor.getProfile`） |
| グラフ | Recharts |
| 多言語化 | next-intl |
| OGP画像生成 | `@vercel/og` |
| 定期実行 | Vercel Cron（1日1回） |
| カスタムフィード | Cloudflare Workers（Feed Generator専用）|
| ORM | Drizzle ORM（Vercel・Cloudflare Workers 両対応、スキーマ一元管理）|
| 開発環境 | Claude Code |
| 公開URL | `bsky-gp.vercel.app`（独自ドメインは後から追加可） |

すべて無料枠で運用することが前提。

---

## 3. 中核となる競争ルール

### 3.1 参加とスタート
- Bluesky OAuth でログイン → 本人確認 → 参加登録
- 「参加登録した瞬間」のフォロワー数が **baseline（スタート地点）**
- baseline からの増加数で競う
- 勝負期間は登録時点から **30日間**

### 3.2 ランキング（3種類 × タブ切り替え）
- **日間**: ある UTC 日（0:00〜23:59）の最終スナップショット − 初回スナップショットの最大値
- **週間**: 月曜 UTC 0:00 を起点とした7日間の最終 − 初回スナップショットの最大値
- **月間**: エントリー開始日から30日間の最終 − 初回スナップショット（= baseline）の最大値

> **「最大」の定義（重要）:**
> 厳密な24時間ローリングウィンドウではなく、
> **「記録されたスナップショットのデータポイント間の差分」** を正とする。
> これは Cron（1日1回）+ Lazy Fetch という不定期かつ離散的な取得方式に起因する制約であり、
> 設計上の意図的な仕様である。
> `entries` テーブルの集計キャッシュカラム（後述）を参照してランキングを構築すること。

- 各ランキングは上位 **100人** まで表示
- すべての集計は **UTC 基準**

### 3.3 クラス別ランキング
登録時のフォロワー数で6クラスに分類。**登録時に確定し、レース中は変動しない。**

| クラス | フォロワー数の範囲 |
|--------|--------------------|
| Rookie | 0 〜 99 |
| Rising | 100 〜 499 |
| Challenger | 500 〜 999 |
| Established | 1,000 〜 4,999 |
| Influencer | 5,000 〜 9,999 |
| Star | 10,000 以上 |

- 総合ランキング（全クラス合同）とは別に、各クラス内のランキングも提供
- 日 / 週 / 月の3種は、総合・クラス別の双方に適用
- UI はタブ2段構成: 上段でクラス選択（総合 / Rookie / …）、下段で期間選択（日 / 週 / 月）

### 3.4 自分の周辺ランキング
- ログインユーザーは、自分が100位圏外でも自分の順位の **前後5名（計11人）** を確認できる
- ランキング下部に「あなたの順位」セクションとして表示、自分の行をハイライト
- 総合・クラス別の双方に適用

### 3.5 再挑戦
- 30日終了後、同じアカウントで再登録できる
- 再登録時のフォロワー数でクラスを再判定（前回 Rookie でも増えていれば昇格）
- 進行中（30日以内）は同一アカウントで重複登録不可
- 過去の挑戦記録はすべて残り、歴代ランキングに反映される
- 同一人物が複数回ランクインすることもあり得る

### 3.6 年間チャンピオン
- 各クラスごとに、年間で最もフォロワー増加数が多かった人がそのクラスの年間王者
- 年度はサービス開始日から1年単位（シーズン制）
  - 例: 2026/7/1 開始なら シーズン1 = 2026/7/1〜2027/6/30
- 最大6人の年間チャンピオン（クラスごとに1人）
- 同一人物が複数回挑戦した場合、その年の最高記録を成績として採用

---

## 4. データベース設計（Neon Postgres）

### 4.1 設計方針
- 再挑戦に対応するため、主キーは **serial id**（DID を主キーにしない）
- 同一 DID は複数の挑戦エントリーを持てる
- 進行中のエントリーは1 DID につき1つだけ（部分ユニーク制約）
- **ハンドル変更対策（重要）**: Bluesky ではハンドルをいつでも変更できる。
  認証・API 呼び出し・DB 結合には必ず不変の `did` を使うこと。
  `handle` / `display_name` / `avatar` はスナップショット保存時（Cron / Lazy Fetch）に
  毎回 Bluesky API の最新値で上書き更新（UPSERT）する。
  ランキングのプロフィールリンクも `did` ベースの URL を使い、
  ハンドル変更後も正しくプロフィールに飛べるようにする。

### 4.2 テーブル定義

```sql
-- entries（挑戦エントリー）
-- スナップショット集計時に集計キャッシュカラムも同時 UPSERT することで
-- ランキング表示時の DB 負荷（都度集計）を排除する。
CREATE TABLE entries (
  id                  SERIAL PRIMARY KEY,
  did                 TEXT      NOT NULL,  -- Bluesky DID
  handle              TEXT      NOT NULL,
  display_name        TEXT,
  avatar              TEXT,
  class               TEXT      NOT NULL,  -- 登録時に確定（Rookie 等）
  baseline_followers  INTEGER   NOT NULL,  -- 登録時のフォロワー数
  season              INTEGER   NOT NULL,  -- 所属シーズン番号
  started_at          TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL, -- started_at + 30日
  is_completed        BOOLEAN   NOT NULL DEFAULT FALSE,
  is_flagged          BOOLEAN   NOT NULL DEFAULT FALSE, -- 異常急増などで要確認
  is_banned           BOOLEAN   NOT NULL DEFAULT FALSE, -- 運営が手動Ban、集計から除外
  last_snapshot_at    TIMESTAMPTZ,         -- 最後に記録した日時（Cron堅牢化用）
  -- 集計キャッシュ（Cron / Lazy Fetch のスナップショット保存時に同時 UPDATE）
  -- 【更新ロジック（重要）】
  -- max_daily_gain / max_weekly_gain / max_monthly_gain は
  -- 「今回の差分」ではなく「30日間の挑戦を通じた過去最高記録」を保持する。
  -- 更新判定: 新しいスナップショット保存後に当該期間の差分を計算し、
  -- 既存の max_xxx_gain よりも大きい場合のみ上書きする（過去最高記録の更新ロジック）。
  -- 例: max_daily_gain = MAX(今日の最終スナップショット − 今日の初回スナップショット,
  --                          既存の max_daily_gain)
  current_followers   INTEGER,             -- 最新フォロワー数（毎回上書き）
  max_daily_gain      INTEGER   DEFAULT 0, -- 日間最大増加数（過去最高のみ更新）
  max_weekly_gain     INTEGER   DEFAULT 0, -- 週間最大増加数（過去最高のみ更新）
  max_monthly_gain    INTEGER   DEFAULT 0  -- 月間最大増加数（過去最高のみ更新）
);
-- 進行中エントリーは 1 DID につき 1 つのみ
CREATE UNIQUE INDEX ON entries (did) WHERE is_completed = FALSE;

-- snapshots（フォロワー数の時系列記録）
CREATE TABLE snapshots (
  id               SERIAL PRIMARY KEY,
  entry_id         INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  followers_count  INTEGER NOT NULL,
  captured_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snapshots_entry ON snapshots (entry_id, captured_at);

-- champions（殿堂 / 年間王者）
CREATE TABLE champions (
  id          SERIAL PRIMARY KEY,
  season      INTEGER NOT NULL,
  class       TEXT    NOT NULL,
  entry_id    INTEGER NOT NULL REFERENCES entries(id),
  total_gain  INTEGER NOT NULL,  -- その年の増加数
  decided_at  TIMESTAMPTZ NOT NULL
);
```

OAuth セッション保存用のテーブルも別途必要（`@atproto/oauth-client-node`
のセッションストア／ステートストア要件に従う）。

---

## 5. 認証（AT Protocol OAuth）

- `@atproto/oauth-client-node` を使用
- `client_id` 用のクライアントメタデータ JSON を
  `https://bsky-gp.vercel.app/client-metadata.json` で公開ホスティング
- DPoP、PKCE、セッション管理、リフレッシュトークン更新に対応
- セッション／ステートのストアは Neon Postgres 上に実装
- ログインフロー: 「Blueskyでログイン」→ Bluesky認証画面 → コールバック → 参加登録
- **OAuth の目的は「本人確認（DID の証明）」のみ**
  - フォロワー数の取得自体は公開 API（`app.bsky.actor.getProfile`）を使用するため、
    特別な読み書きスコープは要求しない
  - Claude Code はスコープ設定でフォロワー読み取り権限を追加しないこと
- ログイン画面にプライバシーポリシーへのリンクを表示

---

## 6. フォロワー数の自動記録とスケーラビリティ

### 6.1 前提となる Vercel 無料枠の制約
- Cron は **1日1回のみ**（高頻度の cron 式はデプロイ失敗）
- Cron に **リトライがない**（失敗すると次は翌日まで実行されない）
- 関数呼び出し 10万回/月、帯域 100GB/月 の上限あり
- 実行時間: Fluid compute により I/O 待ち（API・DB）は CPU 時間に計上されない

### 6.2 Cron 堅牢化対策（必須実装）

**(a) アクティブユーザーのみ対象**
`is_completed = FALSE`（参加から30日以内）のエントリーだけを記録対象にする。
30日経過分はループから除外し、負荷を一定に保つ。

**(b) 「未処理分を進める」設計**
Cron は「全員を一度に処理」ではなく「今日まだ記録していないアクティブ
ユーザー」だけを対象にする。`last_snapshot_at` を見て当日未記録のものを抽出。
途中で関数が終了しても、次回が残りを拾える。

**(c) 1回あたりの処理人数に上限**
1回の Cron で処理する人数に上限を設ける（例: 50人）。
残りは翌日以降に持ち越し。参加者が増えても破綻しない。

**(d) Lazy Fetch をセーフティネットに**
ユーザーがマイページやランキングを開いた時点で、その人が「今日まだ記録
されていなければ」その場で Bluesky API から取得して保存する。
これにより Cron 失敗日でも記録が補完され、リトライ無し問題を実質回避できる。

**(e) 外部 Cron 併用の余地（将来拡張）**
記録 API は通常の HTTP エンドポイントとして実装し、将来高頻度記録が必要に
なったら cron-job.org などの外部サービスから叩けるようにしておく。
外部からの呼び出しには秘密トークンによる検証を付ける。

### 6.3 透明性
- ランキングに「最終更新: ○時間前」を表示する

---

## 7. 画面構成

モバイルファーストで設計（Bluesky 利用者の大半がスマホアプリ経由のため）。
デスクトップでは Bento Grid が映えるようにレスポンシブ拡張する。

### 7.1 トップページ（1ページ完結のランディング型）
- ヒーローセクション: BSKY-GP ロゴ、キャッチコピー、「Blueskyでログインして参戦」ボタン
- Bento Grid レイアウトで以下を配置:
  - ランキング（タブ2段: クラス × 期間）上位100人
  - フォロワー増加の推移グラフ
  - **デッドヒート枠**: 現在最も僅差で競っているライバル2人をリアルタイム表示
    （例: `@aaa.bsky vs @bbb.bsky — あと3人で逆転！`）
  - 参加者数カウンター（初期は非表示、一定数 例:50人 を超えたら「現在○人が参戦中」を表示）
- ルール説明セクション
- フッター: プライバシーポリシー、開発者 Bluesky アカウントへのリンク、言語セレクター

### 7.2 マイページ（ログイン後ダッシュボード）
- 自分の現在順位（総合 + クラス内）
- 勝負期間の残り日数カウントダウン
- 自分のフォロワー増加推移グラフ（詳細版、30日全体）
- プロフィールカードの生成・シェアボタン
- 過去の挑戦履歴一覧

### 7.3 個人ページ（`/player/[did]` など）
- 各参加者の公開プロフィールページ
- OGP メタタグを設定し、Bluesky にURLを貼るとカード表示される
- プロフィールカードと同等の情報を表示

### 7.4 殿堂ページ（Hall of Fame）
- 歴代の年間王者一覧をクラスごとに表示
- トロフィーアイコン付き（クラスごとに色違い）
- 各エントリー: シーズン番号、王者名、記録（増加数）、アバター、Blueskyリンク
- シーズンを重ねるごとに充実していく

### 7.5 エラー / 404 ページ
- ブランドに合わせたカスタムデザイン（空テーマ + GP ロゴ）

---

## 8. プロフィールカード & シェア機能

### 8.1 カードに載せる情報
- アバター画像
- 表示名 + ハンドル
- 総合ランキング順位
- クラス名 + クラス内順位
- 30日間の増加数
- フォロワー増加の推移グラフ（ミニ版）

### 8.2 シェア方法（2種類）
- **画像保存**: カードを PNG 画像としてダウンロードし、任意の SNS に投稿
- **OGPリンク**: 個人ページの URL をコピーし、Bluesky 等に貼るとカード表示

### 8.3 デザイン
- カードのテイストは **ダーク系**（GP の重厚感を演出）
- `@vercel/og` でサーバーサイド生成（OGP とダウンロード用画像を共通化）

---

## 9. デザイン方針（2026年トレンド）

- **Glassmorphism**: 半透明・すりガラス調のカード。空テーマと相性良好
- **Bento Grid**: モジュラーなカードを並べ、1画面で情報を一覧
- **マイクロインタラクション**: ボタンホバー時の微かな膨らみ、スクロール連動フェードイン等
- カラー: 空をイメージしたブルー基調 + ゴールド（アンバー）のアクセント
- F1 グランプリのようなイベント感・お祭り感・スピード感を演出

---

## 10. 多言語対応（6言語）

next-intl を使用。言語ごとの JSON ファイルで翻訳を管理（後から言語追加が容易）。

| # | 言語 | ロケール | 役割・ターゲット |
|---|------|----------|------------------|
| 1 | 日本語 | `ja` | メインターゲット（デフォルト言語） |
| 2 | 英語 | `en` | グローバル標準 |
| 3 | ポルトガル語（ブラジル） | `pt-BR` | Bluesky 最大勢力 |
| 4 | 繁体字中国語（台湾） | `zh-TW` | アジア圏 |
| 5 | ドイツ語 | `de` | 欧州テック・分散型SNS関心層 |
| 6 | フランス語 | `fr` | 欧州アート・クリエイター層 |

- ブラウザの言語設定から自動検出して初期言語を決定
- ページ上の言語セレクターで手動切り替えも可能
- プライバシーポリシーなど全テキストを6言語分用意

---

## 11. プライバシーポリシー

- フッターに「プライバシーポリシー」リンクを設置
- OAuth ログイン画面にもリンクを表示
- 中核の文言: 「取得したデータはランキング表示とグラフ生成以外の目的には
  使用しません」（6言語分の翻訳）
- 開発者の Bluesky アカウントへのリンクを併記
  - 仕様書では `@your-handle.bsky.social` をプレースホルダーとし、後で差し替え

---

## 12. Bluesky カスタムフィード（公式フィード）

- BSKY-GP の参加者（またはクラス上位陣）の投稿を集約するカスタムフィードを提供
- AT Protocol の Feed Generator（`app.bsky.feed.generator`）で実装
- Bluesky アプリ内で「BSKY-GP 参加者の投稿」としてフォロー可能にする
- 参加者同士のフォロー互助ループを促進する狙い
- **Feed Generator は Vercel では動かさない（重要）**
  Bluesky のカスタムフィードはユーザーのスクロールのたびに `getFeedSkeleton`
  リクエストが飛んでくる。サービスがバズると Vercel 無料枠（10万回/月）が
  数時間で溶ける可能性があるため、Feed Generator は最初から
  **Cloudflare Workers**（無料枠: 1日100万リクエスト）で実装する。
  Vercel プロジェクトとは別リポジトリ or 別ディレクトリで管理する。

---

## 13. 運用・セキュリティ・リスク管理

### 13.1 スパム・不正対策（項目26）
- Bot 等による不正なフォロワー購入（異常な急増）を検知するロジックを実装
  - 例: 短時間での増加幅が統計的に異常な値を超えた場合にフラグを立てる
  - 検知したエントリーは「要確認」状態としてランキングから一時除外
- 運営がスパムアカウントを手動で Ban / ランキング除外できる機能
  - エントリーに `is_flagged` / `is_banned` のフラグを持たせ、集計から除外
- Ban されたエントリーはランキング・殿堂・デッドヒート枠すべてから除外

### 13.2 API レートリミット対策（項目27）
- Bluesky（AT Protocol）の API 取得制限に達した際のリトライロジック
  - **Exponential Backoff**（指数バックオフ）で再試行
  - リトライ上限を設け、超えたらその回はスキップして次回 Cron / Lazy Fetch に委ねる
- エラー時のフォールバック: 取得失敗時は前回値を保持し、`last_snapshot_at`
  を更新しないことで「当日未処理」として再取得対象に残す
- レートリミット応答（HTTP 429）のヘッダを尊重し、待機時間を調整

### 13.3 退会・データ削除（オプトアウト）機能（項目28）
- ユーザーが途中でリタイア、またはサービス連携を解除できる導線をマイページに設置
- 削除の対象: 自身の DID に紐づく全エントリー、snapshots、OAuth セッション
- 削除は即時反映（ランキング・殿堂・デッドヒート枠からも除外）
- 削除前に確認ダイアログを表示（誤操作防止、多言語対応）

---

## 14. ユーザー体験（UX）・エンゲージメント

### 14.1 シェア導線の最適化（項目29）
- プロフィールカード生成後、ワンクリックで Bluesky に投稿できる
  **Intent URL** を構築する
- 投稿文には `#BSKY_GP` ハッシュタグと個人ページ URL を自動で含める
- 投稿文テンプレートは多言語対応（閲覧言語に応じた文面）

### 14.2 マイルストーン通知 / 演出（項目30）
- 30日間の途中で次クラスの基準値に到達した際、マイページ上で祝福ポップアップを表示
- 30日終了時にも結果を祝福する専用アニメーションを表示
- マイクロインタラクションの具体化として、達成時の紙吹雪・バッジ点灯等を用意

---

## 15. 保守・マネタイズ

### 15.1 開発者支援（寄付）リンク（項目31）
- Vercel / Neon の無料枠超過に備え、フッターおよびマイページに
  「Buy Me a Coffee」「Ko-fi」等のスポンサー・寄付リンクを設置
- リンク先 URL は環境変数で管理し、後から差し替え可能にする

### 15.2 初期クラス判定の閾値定義（項目32）
- 6段階クラスの閾値は以下を初期値とする:

  | クラス | 下限 | 上限 |
  |--------|------|------|
  | Rookie | 0 | 99 |
  | Rising | 100 | 499 |
  | Challenger | 500 | 999 |
  | Established | 1,000 | 4,999 |
  | Influencer | 5,000 | 9,999 |
  | Star | 10,000 | （上限なし） |

- 閾値は運営側で調整可能にする（環境変数、または DB の設定テーブルで管理）
- クラス判定ロジックは閾値を一箇所から参照する形にし、変更が容易な実装にする

---

## 16. SEO 対策（Next.js App Router 最適化）

多言語・動的ランキング・ユーザープロフィールという BSKY-GP の特性に
合わせた SEO 対策を実装する。

### 16.1 Next.js App Router 標準機能
- **動的メタデータ**: マイページや公開プロフィールページ（`/user/[did]` 等）で
  `generateMetadata` を使い、タイトル・説明文を動的生成
- **サイトマップ / Robots の自動生成**: App Router の `sitemap.ts` と
  `robots.ts` を使用。参加者が増えるごとにプロフィールページ URL を
  動的にサイトマップへ追加し、クローラーの巡回を促す

### 16.2 多言語（国際化）SEO（必須）
- **hreflang（代替言語タグ）**: 6言語（ja, en, pt-BR, zh-TW, de, fr）に対応するため、
  各ページのメタデータに `alternates.languages` を設定
- 検索エンジンに「どの地域・言語のユーザーにどのページを表示すべきか」を伝える

### 16.3 OGP と動的画像生成
- `@vercel/og`（`ImageResponse`）でユーザーごとの推移グラフ・ランキングを
  含む OGP 画像を動的生成（`/api/og`）。項目16のプロフィールカードと共通基盤
- SNS シェアによる認知拡大が間接的に SEO に寄与する

### 16.4 レンダリングとインデックス最適化
- 公開ランキング（`/ranking`）や殿堂ページ（`/hall-of-fame`）は
  **SSR または ISR** でサーバー側 HTML を出力
- クローラーが JS 実行を待たずにテキストデータを確実に読み取れるようにする

### 16.5 構造化データ（JSON-LD）
- `SoftwareApplication` / `WebSite` の構造化データを各ページの
  `<script type="application/ld+json">` に埋め込み、リッチリザルトに対応

### 16.6 パフォーマンス（Core Web Vitals）
- 画像は `next/image`、フォントは `next/font` で最適化
- Recharts などの重い JS ライブラリは、ファーストビュー外なら
  `next/dynamic` で遅延読み込み（Lazy Load）

### 16.7 セマンティック HTML
- Bento Grid / Glassmorphism のスタイリングでも `<div>` を多用しすぎず、
  ランキングリストは `<ol>` / `<ul>`、見出しは `<h1>` / `<h2>`、
  独立コンテンツは `<article>` / `<section>` を使い、文書構造を正しく伝える

---

## 17. 将来拡張（v1 では未実装、設計上の余地を残す）

- 順位変動時の Bluesky への自動通知ポスト
- シーズン終了時の年間王者発表アニメーション／特設ページ
- 外部 Cron による高頻度記録
- 独自ドメインへの移行

---

## 18. 実装の優先順位（推奨）

1. プロジェクト基盤（Next.js + TypeScript + Tailwind + Neon 接続 + スキーマ）
2. Bluesky OAuth 認証フロー
3. 参加登録 + baseline 記録 + クラス判定（閾値は設定から参照）
4. フォロワー数記録（Cron + Lazy Fetch のハイブリッド、Exponential Backoff 込み）
5. ランキング集計ロジック（日 / 週 / 月、総合 + クラス別、周辺ランキング）
6. トップページ UI（Bento Grid、ランキング、グラフ、デッドヒート枠）
7. マイページ / 個人ページ（退会・データ削除導線を含む）
8. プロフィールカード + OGP 画像生成 + シェア（Bluesky Intent URL 込み）
9. スパム・不正検知 + 運営用 Ban / 除外機能
10. マイルストーン通知・達成演出
11. 多言語対応（6言語）
12. 殿堂ページ + 年間チャンピオン集計
13. カスタムフィード（Feed Generator）
14. SEO 対策（メタデータ、sitemap/robots、hreflang、JSON-LD、SSR/ISR、Core Web Vitals）
15. プライバシーポリシー、寄付リンク、404、最終調整

---

## 19. 確定仕様チェックリスト（全33項目）

- [x] 1. サービス名: BSKY-GP（Bluesky Grand Prix）、`#BSKY_GP`
- [x] 2. Bluesky OAuth（AT Protocol）で本人認証
- [x] 3. 誰でも参加可能、各自のタイミングでスタート、勝負期間30日
- [x] 4. ランキング3種（日/週/月の最大増加数）、タブ切り替え、上位100人
- [x] 5. 名前クリックで Bluesky プロフィールに遷移
- [x] 6. フォロワー増加の推移グラフ（30日全体、Recharts）
- [x] 7. 30日終了後に再登録可能、クラス再判定、過去記録は歴代ランキングに残る
- [x] 8. Next.js（App Router）× TypeScript × Tailwind CSS
- [x] 9. Vercel + Neon Postgres、すべて無料枠
- [x] 10. 2026年トレンドのデザイン（Glassmorphism、Bento Grid、マイクロインタラクション）
- [x] 11. Cron 堅牢化対策（アクティブのみ／未処理分を進める／人数上限／Lazy Fetch／外部Cron余地）
- [x] 12. 公開先: Vercel デフォルトドメイン（`bsky-gp.vercel.app`）
- [x] 13. 開発環境: Claude Code
- [x] 14. 多言語対応（6言語、自動検出 + 手動切り替え）
- [x] 15. クラス別ランキング（6段階、登録時フォロワー数で固定）
- [x] 16. プロフィールカード（画像保存 + OGPリンク、ダーク系、推移グラフ付き）
- [x] 17. DB 主キーは serial id、部分ユニーク制約で進行中は1DIDにつき1エントリー
- [x] 18. ランキング日付基準は UTC 固定
- [x] 19. プライバシーポリシー（フッター + 認証画面、開発者 Bluesky リンク付き）
- [x] 20. Bluesky 公式カスタムフィード（参加者の投稿を集約）
- [x] 21. デッドヒート枠（Bento Grid に僅差ライバルをリアルタイム表示）
- [x] 22. マイページ（ログイン後ダッシュボード、モバイルファースト）
- [x] 23. 年間チャンピオン（クラスごとの年間最大増加数、サービス開始日から1年単位）
- [x] 24. 殿堂ページ（歴代王者一覧 + トロフィー表示）
- [x] 25. 周辺ランキング（自分の前後5名 = 計11人を表示、自分をハイライト）
- [x] 26. スパム・不正対策（異常急増の検知、運営による Ban / ランキング除外）
- [x] 27. API レートリミット対策（Exponential Backoff、エラー時フォールバック）
- [x] 28. 退会・データ削除（オプトアウト）機能（DID・履歴の即時削除導線）
- [x] 29. シェア導線の最適化（Bluesky Intent URL、`#BSKY_GP` 付きワンクリック投稿）
- [x] 30. マイルストーン通知 / 演出（クラス昇格到達・30日終了時の祝福演出）
- [x] 31. 開発者支援（寄付）リンク（Buy Me a Coffee / Ko-fi、フッター + マイページ）
- [x] 32. 初期クラス判定の閾値定義（6段階の境界明確化、運営側で調整可能）
- [x] 33. SEO 対策（動的メタデータ、sitemap/robots、hreflang、OGP動的生成、SSR/ISR、JSON-LD、Core Web Vitals、セマンティックHTML）

---

## 20. Claude Code への指示メモ

- このファイルをプロジェクトルートに置き、開発の起点とする
- セクション18の優先順位で段階的に実装し、各段階で動作確認する
- 環境変数（`DATABASE_URL`、OAuth 関連、外部Cron用トークン等）は
  `.env.example` にまとめ、README にセットアップ手順を書く
- Vercel 無料枠を超えないよう、関数呼び出し回数を意識した実装にする
  （特に Lazy Fetch は「当日未記録のときだけ」取得するよう必ずガードする）
- すべてのユーザー入力（ハンドル等）はサーバー側で検証する
- 開発者の Bluesky ハンドルは後から差し替えられるよう一箇所に定数化する

### 推奨開発ツール・リソース

**UI コンポーネント**
- `shadcn/ui`（https://ui.shadcn.com）: タブ・ダイアログ・カード等のベースに使う
- `Magic UI`（https://magicui.design）/ `Aceternity UI`（https://ui.aceternity.com）:
  GP感を演出するアニメーション系コンポーネント。
  **必ず `next/dynamic` で遅延読み込みすること**（Core Web Vitals 保護）

**ORM**
- `Drizzle ORM`（https://orm.drizzle.team）: Vercel と Cloudflare Workers の両方から
  同じ Neon DB を叩く今回の構成では事実上一択。スキーマを一元管理する。
  Prisma は Cloudflare Workers で動作しないため使用しないこと。

**OGP テスト**
- `opengraph.xyz`（https://www.opengraph.xyz）: プロフィールカードの SNS 表示確認
- ローカル環境を `ngrok` で外部公開し、本番デプロイ前にクローラーの見え方をテストする
  （Bluesky は独自キャッシュを持つため、バグが起きると修正が面倒）

**翻訳ファイル生成**
- `v0.dev`（https://v0.dev）: 6言語分の `ja.json` / `en.json` 等を一括生成する用途に使う。
  「仕様書をベースに next-intl 形式で6言語分作って」と指示すると高速にローカライズできる

### リポジトリ構成（モノレポ）

Next.js と Cloudflare Workers で Drizzle スキーマを共通利用するため、
最初から **pnpm workspaces によるモノレポ構成** で初期化すること。

```
my-bsky-gp-repo/
├── apps/
│   ├── web/              # Next.js (Vercel)
│   └── feed-generator/   # Cloudflare Workers
├── packages/
│   └── db/               # Drizzle スキーマ・マイグレーション（共通）
├── package.json
└── pnpm-workspace.yaml
```

- `packages/db` に Drizzle のスキーマ定義を置き、`apps/web` と
  `apps/feed-generator` の両方からインポートして使う
- スキーマ変更が一箇所で完結し、型の不整合を防げる

### Neon Postgres コネクション対策（Edge 環境）

Next.js（Serverless）と Cloudflare Workers（Edge）が同時に Neon に接続すると、
無料プランの同時接続数上限（約20コネクション）に達するリスクがある。

- **Cloudflare Workers 側（`apps/feed-generator`）では必ず Neon の HTTP ドライバーを使う**
  ```ts
  // NG: WebSocket接続（コネクションが張りっぱなしになる）
  import { drizzle } from 'drizzle-orm/neon-serverless';

  // OK: HTTP経由（クエリ完了後に即座に解放される）
  import { neon } from '@neondatabase/serverless';
  import { drizzle } from 'drizzle-orm/neon-http';
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  ```
- Next.js 側（`apps/web`）も Serverless 環境なので同様に HTTP ドライバーを使うこと
- これにより無料枠のコネクション上限を完全に回避できる
