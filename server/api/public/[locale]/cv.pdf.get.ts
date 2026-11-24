// PDF — тот же docx из useCvDocx, сконвертированный LibreOffice: вёрстка у них одна.
// Кэш на 3 дня, сбрасывается при перезапуске (см. server/plugins/reset-cv-cache.ts)
export default defineCachedBinaryHandler(async (event) => {
    const pdf = await useDocxToPdf(await useCvDocx(event))
    setHeader(event, 'Content-Type', 'application/pdf')
    return pdf
}, {
    maxAge: CV_CACHE_SECONDS,
    getKey: (event) => `cv-pdf:${getRouterParam(event, 'locale') || 'unknown'}`
})
