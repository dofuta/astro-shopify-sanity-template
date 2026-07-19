# Astro Shopify Sanity Template

Astro + Shopify Storefront API + Sanity + Netlify で構築するヘッドレスECサイトのテンプレートです。商品表示・カート・チェックアウトは Shopify、コンテンツ管理は Sanity（Studio 埋め込み・Live Preview 対応）、ホスティングは Netlify を利用します。

## 必要環境

- Node.js `22.14.0`（`.node-version` を参照。`nodenv` / `nvm` 等での切り替えを推奨。Sanity CLI が Node 22.12 以上を要求するため）
- npm

## セットアップ手順

1. リポジトリを clone する

```sh
git clone <repository-url>
cd astro-shopify-sanity-template
```

2. 依存関係をインストールする

```sh
npm install
```

3. `.env.example` をコピーして `.env` を作成する

```sh
cp .env.example .env
```

4. `.env` の各環境変数を設定する（→ [環境変数（APIキー設定）](#環境変数apiキー設定)）

5. 開発サーバーを起動する

```sh
npm run dev
```

`http://localhost:4321` でアクセスできます。

## 環境変数（APIキー設定）

すべての環境変数は `.env` に設定します。`.env` は `.gitignore` 済みのためリポジトリにはコミットされません。

### サイト設定

| 変数          | 説明                                     | 例                    |
| :------------ | :--------------------------------------- | :-------------------- |
| `BASE_DOMAIN` | 公開サイトのベースURL（sitemap等に使用） | `https://example.com` |
| `AUTHOR`      | サイトの作成者・ショップ名               | `My Shop`             |
| `THEME_COLOR` | テーマカラー                             | `#E2E2E1`             |
| `SITE_TITLE`  | サイトタイトル                           | `My Shop`             |

### Shopify Storefront API

Shopify 管理画面に **Headless** アプリをインストールし、**非公開アクセストークン**（`shpat_` から始まる値）を発行して使用します。詳細な取得手順は [docs/INTRODUCTION.md](docs/INTRODUCTION.md) を参照してください。

| 変数                                      | 説明                                                            | 例                         |
| :---------------------------------------- | :-------------------------------------------------------------- | :------------------------- |
| `SHOPIFY_STORE_DOMAIN`                    | ストアのドメイン                                                | `your-store.myshopify.com` |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN`         | **非公開**アクセストークン（`shpat_` 始まり。絶対に公開しない） | `shpat_xxxxxxxxxxxx`       |
| `SHOPIFY_PUBLIC_STOREFRONT_ACCESS_TOKEN`  | **任意・Analytics 用**の公開 Storefront アクセストークン         | `xxxxxxxxxxxx`             |
| `PUBLIC_SHOPIFY_ANALYTICS_ENABLED`        | Shopify Analytics スクリプトを出力するか                        | `true` / `false`           |
| `SHOPIFY_API_VERSION`                     | 使用する API バージョン（未指定時は `2026-01`）                 | `2026-01`                  |
| `SHOPIFY_ADMIN_API_ACCESS_TOKEN`          | **任意・開発時のみ**。メタフィールド config の自動生成に使用    | `shpat_xxxxxxxxxxxx`       |

> 通常の商品・カート API はすべてサーバー側（Netlify Functions）経由で呼び出し、**非公開アクセストークン**を使用します。Shopify Analytics を有効化する場合のみ、同一オリジンの Storefront API Proxy（`/api/{version}/graphql.json`）が `SHOPIFY_PUBLIC_STOREFRONT_ACCESS_TOKEN` をサーバー側で注入します。この公開トークンはクライアントJSには埋め込みません。

> 既存の Shopify 本番ストアの Analytics データを汚さないよう、検証時は開発ストアの `SHOPIFY_STORE_DOMAIN` / トークンを Netlify の Deploy Preview またはローカル `.env` に設定してください。本番にアナリティクススクリプトを出したくない環境では `PUBLIC_SHOPIFY_ANALYTICS_ENABLED=false` または未設定にします。

> `SHOPIFY_ADMIN_API_ACCESS_TOKEN` は `npm run gen:metafields`（メタフィールド定義の config 自動生成）でのみ使用します。生成物（`src/lib/metafields.generated.ts`）はリポジトリにコミットされ、ビルド・本番では Admin API を呼び出しません。そのため Netlify 等のビルド環境にこのトークンを登録する必要はありません。詳細は [メタフィールド](#メタフィールド) を参照してください。

### Sanity

[sanity.io/manage](https://www.sanity.io/manage) でプロジェクトを作成して取得します。詳細は [Sanity セットアップ](#sanity-セットアップ) を参照してください。

| 変数                             | 説明                                                | 例                       |
| :------------------------------- | :-------------------------------------------------- | :----------------------- |
| `SANITY_STUDIO_PROJECT_ID`       | Sanity プロジェクトID                               | `abc12345`                |
| `SANITY_STUDIO_DATASET`          | データセット名                                       | `production`              |
| `SANITY_API_READ_TOKEN`          | Viewer権限のAPIトークン（Live Preview用・任意）      | `sk...`                   |
| `SANITY_VISUAL_EDITING_ENABLED`  | Live Preview（SSR）を有効化するか（任意・既定false） | `true` / `false`          |
| `SANITY_STUDIO_PREVIEW_URL`      | Presentation Tool が開くフロントエンドURL（任意）    | `http://localhost:4321`   |

> Studio 関連の変数名は `SANITY_STUDIO_` 接頭辞で統一しています（Sanity 公式の規約。この接頭辞の変数だけが `sanity.config.ts` や埋め込みStudioのブラウザバンドルから読めるため）。

> APIキー・トークンは秘匿情報です。`.env` 以外の場所に書き込んだり、リポジトリにコミットしたりしないでください。

## コマンド一覧

プロジェクトルートのターミナルから実行します。

| コマンド                 | 内容                                                     |
| :----------------------- | :------------------------------------------------------- |
| `npm install`            | 依存関係をインストール                                   |
| `npm run dev`            | 開発サーバーを起動（`http://localhost:4321`）            |
| `npm run dev:phone`      | 開発サーバー起動 + スマホ実機確認用のQRコード/URLを表示  |
| `npm run build`          | 本番ビルドを `./dist/` に生成                            |
| `npm run preview`        | ビルド結果をローカルでプレビュー                         |
| `npm run astro ...`      | `astro add` や `astro check` などの Astro CLI を実行     |
| `npm run gen:metafields` | Admin API からメタフィールド定義を取得し config を再生成 |
| `npm run typegen`        | Sanity のスキーマ・GROQクエリから `sanity.types.ts` を再生成 |

## Sanity セットアップ

コンテンツ管理には [Sanity](https://www.sanity.io/) を使用します。Studio はこのリポジトリ内に埋め込まれており（`/studio`）、別リポジトリの用意は不要です。

### 新規案件（クライアント）のセットアップ

複数の案件を並行して扱う場合、Sanity の CLI ログイン状態はマシン全体で共有される（アカウントを切り替えづらい）ため、**プロジェクト作成・設定は基本的にブラウザ（sanity.io/manage）から行い、CLI ログインは行わない運用**を推奨します。

1. 案件用のメールアドレスで Sanity アカウントを作成する（すでに他案件用のアカウントでログイン中のブラウザとは別のブラウザ/プロファイル、またはシークレットウィンドウを使うとアカウント混在を防げます）
2. [sanity.io/manage](https://www.sanity.io/manage) で新規プロジェクトを作成する
3. プロジェクトの **API > CORS Origins** に、Allow credentials を有効にして以下を追加する
   - `http://localhost:4321`（ローカル開発用）
   - 本番の公開URL（例: `https://example.com`）
   - Netlify の Deploy Preview / Branch deploy のURL（Live Preview を使う場合。ワイルドカードでの登録も可）
4. **API > Tokens** で Viewer 権限のトークンを発行する（Live Preview 用。Studio 編集自体には不要）
5. プロジェクトの **Project ID** と、使用する **Dataset** 名（通常は `production`）を控える
6. `.env` に `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` / `SANITY_API_READ_TOKEN` を設定する（→ [環境変数（APIキー設定）](#環境変数apiキー設定)）
7. Netlify 側にも同じ環境変数を登録する（→ [Netlify デプロイ](#netlify-デプロイ)）

`sanity schema extract` / `sanity typegen generate`（`npm run typegen`）はローカルのスキーマファイルのみで動作するため、上記の認証情報だけで CLI ログインなしに利用できます。Studio 自体のデプロイも Netlify 経由（このリポジトリのビルド）で行われるため、`sanity deploy` も不要です。

### スキーマの追加・変更

1. `src/sanity/schemaTypes/` にスキーマファイル（`defineType` / `defineField`）を追加し、`src/sanity/schemaTypes/index.ts` の `schemaTypes` に登録する
2. GROQ クエリは `src/sanity/lib/queries.ts` に `defineQuery` で追加する（TypeGen が検出できるように、クエリはこのファイルに集約する）
3. 型を再生成する

```sh
npm run typegen
```

4. 生成された `sanity.types.ts` をコミットする（型はリポジトリにコミットする方針です）

### Studio の確認

`npm run dev` の状態で `http://localhost:4321/studio` にアクセスすると、埋め込みStudioが開きます。初回アクセス時に CORS 未許可の警告が出た場合は、上記の CORS Origins 設定を確認してください。

### Live Preview（Visual Editing）

Live Preview は Sanity の Presentation Tool から、下書き（draft）状態のコンテンツをフロントエンドにプレビュー表示する機能です。プレビュー中はページが SSR（サーバー側で毎回描画）になるため、本番の全ページ SSG というこのテンプレートの配信特性を保つために、既定では無効化されています。

- **ローカル開発**: `.env` の `SANITY_VISUAL_EDITING_ENABLED` を `true` にし、`SANITY_API_READ_TOKEN` を設定して `npm run dev` を起動する。Studio の `/studio` から Presentation Tool を開き、コンテンツを選択すると右側にフロントエンドが表示され、編集内容がリアルタイムに反映される
- **プレビュー用デプロイ（Netlify の Branch deploy 等）**: 該当デプロイコンテキストの環境変数でのみ `SANITY_VISUAL_EDITING_ENABLED=true` / `SANITY_API_READ_TOKEN` を設定する。本番（Production）の環境変数では `SANITY_VISUAL_EDITING_ENABLED` は `false`（または未設定）のままにする
- 対象は Sanity 連携ページ（`/news` 以下）のみです。Shopify 側のページには影響しません

### 公開時に本番を再ビルドする（Webhook）

本番は SSG（ビルド時にコンテンツを取得）のため、Sanity 側でコンテンツを公開したタイミングで Netlify の再ビルドを走らせる必要があります。

1. Netlify の **Site configuration > Build & deploy > Build hooks** で Build Hook を作成し、URLを控える
2. Sanity の **sanity.io/manage > プロジェクト > API > Webhooks** で新規Webhookを作成し、上記のURLをターゲットに設定する（トリガー: `Create` / `Update` / `Delete`、Filter は任意）
3. コンテンツを公開すると Webhook が発火し、Netlify が再ビルドして本番に反映される

## メタフィールド

商品（product）・バリアント（variant）のメタフィールドを取得して商品詳細ページに表示できます。

Shopify Storefront API はメタフィールドを「一括取得」できず、`namespace` + `key` を明示的に指定する必要があります。そのため、表示したいメタフィールド定義を `src/lib/metafields.generated.ts` に集約し、これを単一の真実の源（single source of truth）として Storefront クエリ・型・表示が連動する設計になっています。

### config の自動生成

`src/lib/metafields.generated.ts` は、Admin API のメタフィールド定義から自動生成できます。

1. Shopify 側でメタフィールド定義を作成し、**Storefront アクセスを公開（`PUBLIC_READ`）** に設定する
2. `.env` に `SHOPIFY_ADMIN_API_ACCESS_TOKEN` を設定する（`read_products` スコープのカスタムアプリ）
3. 生成コマンドを実行する

```sh
npm run gen:metafields
```

これにより、Storefront から読める（`PUBLIC_READ`）スカラー型のメタフィールド定義だけが抽出され、`src/lib/metafields.generated.ts` に書き出されます。

> 生成物はリポジトリにコミットしてください。ビルド・本番では Admin API を呼び出さず、コミットされた config を参照します。メタフィールド定義を追加・変更したら再実行してください。

### 表示ラベルの調整

生成物の `label`（Shopify の定義名 `name` を流用）を変更したい場合は、再生成で上書きされないよう注意してください。恒久的に上書きしたい場合は、生成スクリプト側または別途 override の仕組みを追加することを検討してください。

## Netlify デプロイ

`.env` はリポジトリに含まれないため、Netlify 側にも同じ環境変数を設定する必要があります。

1. Netlify にサイトを接続する（ビルド設定は [netlify.toml](netlify.toml) に定義済み）
2. Netlify 管理画面 > **Site configuration > Environment variables** に、`.env` と同じ環境変数を登録する

Shopify Analytics を使う場合は、Netlify のデプロイコンテキストごとに次を設定します。

- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `SHOPIFY_PUBLIC_STOREFRONT_ACCESS_TOKEN`
- `SHOPIFY_API_VERSION`
- `PUBLIC_SHOPIFY_ANALYTICS_ENABLED`

開発ストアで検証する Deploy Preview では開発ストアの値を設定し、本番ストアに紐づく環境では意図したタイミングでのみ `PUBLIC_SHOPIFY_ANALYTICS_ENABLED=true` にしてください。

詳細は [docs/INTRODUCTION.md](docs/INTRODUCTION.md) の「Netlify デプロイ時の設定」を参照してください。

Sanity 関連は、すべてのデプロイコンテキストに次を設定します。

- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET`

Live Preview（Visual Editing）を使う場合のみ、**該当デプロイコンテキスト（例: Deploy Preview / Branch deploy）だけ**に次を追加設定してください。本番（Production）には設定しないでください。

- `SANITY_VISUAL_EDITING_ENABLED=true`
- `SANITY_API_READ_TOKEN`
- `SANITY_STUDIO_PREVIEW_URL`（そのデプロイ自身のURL）

コンテンツ公開時の自動再ビルドについては [Sanity セットアップ](#sanity-セットアップ) の「公開時に本番を再ビルドする（Webhook）」を参照してください。
