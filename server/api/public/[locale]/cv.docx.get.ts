export default defineCachedBinaryHandler((event) => useCvDocx(event).build(), {
    maxAge: useRuntimeConfig().cache.cv,
    getKey: (event) => `cv-docx:${getRouterParam(event, 'locale') ?? 'unknown'}`,
})
