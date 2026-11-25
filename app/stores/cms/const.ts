export const CMS_CACHE_FRESH_MS = import.meta.server ? 300_000 : 60_000
export const CMS_CACHE_STALE_MS = import.meta.server ? 86_400_000 : 0
export const CMS_CACHE_MAX_ENTRIES = 500

export const CMS_BATCH_WINDOW_MS = 0

export const CMS_BATCH_MAX_URL = 6_000

export const CMS_AUTO_PARAMS = ['locale', 'theme'] as const
