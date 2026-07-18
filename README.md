# Astro Shopify Template

Astro + Shopify Storefront API + microCMS + Netlify で構築するヘッドレスECサイトのテンプレートです。商品表示・カート・チェックアウトは Shopify、コンテンツ管理は microCMS、ホスティングは Netlify を利用します。

## 必要環境

- Node.js `21.7.3`（`.node-version` を参照。`nodenv` / `nvm` 等での切り替えを推奨）
- npm

## セットアップ手順

1. リポジトリを clone する

```sh
git clone <repository-url>
cd astro-shopify-template
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

### microCMS

microCMS 管理画面の **サービス設定 > API設定 > APIキー** から取得します。

| 変数                      | 説明                             | 例               |
| :------------------------ | :------------------------------- | :--------------- |
| `MICROCMS_SERVICE_DOMAIN` | サービスドメイン                 | `your-service`   |
| `MICROCMS_API_KEY`        | APIキー                          | `your-api-key`   |
| `MICROCMS_DRAFT_KEY`      | ドラフトプレビュー用キー（任意） | `your-draft-key` |

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
