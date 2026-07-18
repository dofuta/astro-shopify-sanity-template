// ロケール設定（言語の単一の真実の源）
//
// Shopify Storefront API の @inContext(language:) に渡す LanguageCode へのマッピングと
// HTML の lang 属性値を一元管理する。英語対応時はここに参照される /en/ ページを足すだけでよい。

export const DEFAULT_LOCALE = 'ja';

export const LOCALES = {
  ja: { shopifyLanguage: 'JA', htmlLang: 'ja', ogLocale: 'ja_JP' },
  en: { shopifyLanguage: 'EN', htmlLang: 'en', ogLocale: 'en_US' },
} as const;

export type Locale = keyof typeof LOCALES;
