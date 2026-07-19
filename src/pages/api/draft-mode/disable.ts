export const prerender = false;

import type { APIRoute } from 'astro';
import { perspectiveCookieName } from '@sanity/preview-url-secret/constants';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete(perspectiveCookieName, { path: '/' });
  return redirect('/', 307);
};
