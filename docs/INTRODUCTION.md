# Shopify セットアップガイド

## 1. Headless アプリのインストール

Shopify 公式の **Headless** アプリをストアにインストールする。

- URL: https://apps.shopify.com/headless
- 無料

![Headlessアプリのインストール画面](./images/スクリーンショット%202026-04-12%2015.36.56.png)

---

## 2. Storefront API トークンの取得

アプリをインストール後、管理画面 **Headless > Storefront API** からトークンを確認・発行する。

![非公開アクセストークンの確認画面](./images/スクリーンショット%202026-04-12%2015.39.54.png)

### トークンの種類

| トークン                   | 用途                                                   | このプロジェクトでの扱い |
| -------------------------- | ------------------------------------------------------ | ------------------------ |
| **公開アクセストークン**   | ブラウザ（クライアント側）から直接APIを呼ぶ用          | **使わない**             |
| **非公開アクセストークン** | サーバー側から安全にAPIを呼ぶ用（`shpat_` から始まる） | `.env` に設定する        |

> このプロジェクトはすべての Shopify API 呼び出しを Netlify Functions（サーバー側）経由で行うため、**非公開アクセストークンのみ**使用する。

---

## 3. `.env` の設定チェックリスト

- [ ] `SHOPIFY_STORE_DOMAIN` — ストアのドメイン（例: `your-store.myshopify.com`）  
      → Shopify 管理画面の URL から確認（`https://admin.shopify.com/store/xxxx` の `xxxx` 部分に `.myshopify.com` を付ける）
- [ ] `SHOPIFY_STOREFRONT_ACCESS_TOKEN` — **非公開**アクセストークン（`shpat_` から始まる値）  
      → Headless アプリ > Storefront API > 「非公開アクセストークン」の目のアイコンで表示してコピー
- [ ] `SHOPIFY_API_VERSION` — 使用する API バージョン  
      → Shopify 管理画面には表示されない。自分で選んで指定する固定値  
      → 推奨: `2026-01`（四半期ごとにリリース。最新より1つ前の安定版を使うのが安全）

### `.env` 記入例

```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2026-01
```

---

## 4. Netlify デプロイ時の設定

`.env` ファイルはリポジトリに含まれないため、Netlify 管理画面でも同じ値を設定する。

- [ ] Netlify 管理画面 > **Site configuration > Environment variables** に上記3変数を追加
