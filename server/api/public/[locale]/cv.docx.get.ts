export default defineCachedBinaryHandler(event => useCvDocx(event), {
    maxAge: 600,
    getKey: (event) => `cv-docx:v34:${getRouterParam(event, 'locale') || 'unknown'}`
})
