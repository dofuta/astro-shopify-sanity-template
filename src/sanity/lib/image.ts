import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import { sanityClient } from 'sanity:client';

const builder = createImageUrlBuilder(sanityClient);

/** Sanity の画像フィールドから配信URLを組み立てる（`.width(800).url()` のようにチェーンできる） */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
