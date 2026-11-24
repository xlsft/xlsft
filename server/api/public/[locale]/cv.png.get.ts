// превью первой страницы резюме для виджета скачивания в ассистенте — LibreOffice рисует её из того же docx.
// Кэш на 3 дня, сбрасывается при перезапуске (см. server/plugins/reset-cv-cache.ts)
export default defineCachedBinaryHandler(async (event) => {
    const png = await useDocxConvert(await useCvDocx(event), 'png')
    setHeader(event, 'Content-Type', 'image/png')
    return png
}, {
    maxAge: CV_CACHE_SECONDS,
    getKey: (event) => `cv-png:${getRouterParam(event, 'locale') || 'unknown'}`
})
