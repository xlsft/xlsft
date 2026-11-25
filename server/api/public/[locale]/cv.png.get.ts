export default defineCachedBinaryHandler(async (event) => {
    const png = await useLibreoffice().convert(await useCvDocx(event).build(), 'png')
    setHeader(event, 'Content-Type', 'image/png')
    return png
}, {
    maxAge: useRuntimeConfig().cache.cv,
    getKey: (event) => `cv-png:${getRouterParam(event, 'locale') ?? 'unknown'}`,
})
