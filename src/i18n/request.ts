import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['ja', 'en', 'pt-BR', 'zh-TW', 'de', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ja';

export const LOCALE_COOKIE = 'bskygp_locale';

/** Accept-Language header → best matching locale, or undefined */
function matchAcceptLanguage(acceptLang: string): Locale | undefined {
  const langs = acceptLang
    .split(',')
    .map((s) => s.split(';')[0].trim().toLowerCase())
    .filter(Boolean);

  for (const lang of langs) {
    // Exact match (case-insensitive)
    const exact = locales.find((l) => l.toLowerCase() === lang);
    if (exact) return exact;

    // Primary subtag match: 'pt-br' → 'pt-BR', 'zh' → 'zh-TW'
    const primary = lang.split('-')[0];
    const prefix = locales.find((l) => l.toLowerCase().startsWith(primary));
    if (prefix) return prefix;
  }
  return undefined;
}

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const acceptLang   = headerStore.get('accept-language') ?? '';

  let locale: Locale = defaultLocale;

  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    locale = cookieLocale as Locale;
  } else {
    const detected = matchAcceptLanguage(acceptLang);
    if (detected) locale = detected;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
