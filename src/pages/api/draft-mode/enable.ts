export const prerender = false;

import type { APIRoute } from 'astro';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { perspectiveCookieName } from '@sanity/preview-url-secret/constants';
import { sanityClient } from 'sanity:client';

// Sanity の Presentation Tool（Studio）がこのルートを GET で呼び出し、
// 秘密鍵を検証した上で draft mode 用の Cookie をセットする。
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const token = import.meta.env.SANITY_API_READ_TOKEN;
  if (!token) {
    return new Response('Server misconfigured: SANITY_API_READ_TOKEN が未設定です', {
      status: 500,
    });
  }

  const clientWithToken = sanityClient.withConfig({ token });
  const { isValid, redirectTo = '/', studioPreviewPerspective } = await validatePreviewUrl(
    clientWithToken,
    request.url,
  );

  if (!isValid) {
    return new Response('Invalid secret', { status: 401 });
  }

  cookies.set(perspectiveCookieName, studioPreviewPerspective ?? 'drafts', {
    httpOnly: false,
    sameSite: 'none',
    secure: true,
    path: '/',
  });

  return redirect(redirectTo, 307);
};
