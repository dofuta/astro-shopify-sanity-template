import { defineField, defineType } from 'sanity';

export const pageType = defineType({
  name: 'page',
  title: 'ページ',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'タイトル',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: '概要（OGP・meta description用）',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'body',
      title: '本文',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
  },
});
