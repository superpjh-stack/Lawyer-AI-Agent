import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lexagent.kr';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/dashboard',
          '/cases/',
          '/clients/',
          '/documents/',
          '/deadlines/',
          '/research/',
          '/drafting/',
          '/billing/',
          '/advisory/',
          '/settings/',
          '/chat/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
