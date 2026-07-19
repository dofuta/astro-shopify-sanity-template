import { defineQuery } from 'groq';

export const NEWS_LIST_QUERY = defineQuery(`
  *[_type == "news" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt
  }
`);

export const NEWS_DETAIL_QUERY = defineQuery(`
  *[_type == "news" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    body
  }
`);
