import { toHTML } from '@portabletext/to-html';
import type { TypedObject } from '@portabletext/types';

/** Portable Text（body フィールド）を HTML 文字列に変換する */
export function portableTextToHtml(blocks: TypedObject[] | null | undefined): string {
  if (!blocks || blocks.length === 0) return '';
  return toHTML(blocks);
}
