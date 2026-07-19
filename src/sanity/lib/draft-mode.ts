import type { AstroCookies } from 'astro';
import { perspectiveCookieName } from '@sanity/preview-url-secret/constants';

/**
 * Draft mode（Live Preview）の状態を Cookie から読み取る。
 * Cookie が存在する = Presentation Tool 経由でプレビュー中。
 */
export function getDraftModeProps(cookies: AstroCookies) {
  const perspectiveCookie = cookies.get(perspectiveCookieName)?.value;
  return {
    draftMode: Boolean(perspectiveCookie),
    perspectiveCookie,
  };
}
