// кэш на 3 дня, сбрасывается при перезапуске (см. server/plugins/reset-cv-cache.ts)
export default defineCachedBinaryHandler(event => useCvDocx(event), {
    maxAge: CV_CACHE_SECONDS,
    getKey: (event) => `cv-docx:${getRouterParam(event, 'locale') || 'unknown'}`
})
