export default defineCachedBinaryHandler(async (event) => {
    const pdf = await useLibreoffice().convert(await useCvDocx(event).build(), 'pdf')
    setHeader(event, 'Content-Type', 'application/pdf')
    return pdf
}, {
    maxAge: useRuntimeConfig().cache.cv,
    getKey: (event) => `cv-pdf:${getRouterParam(event, 'locale') ?? 'unknown'}`,
})
