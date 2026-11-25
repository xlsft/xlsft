const ipx = useIpx()

export default defineCachedBinaryHandler(ipx.process, {
    maxAge: useRuntimeConfig().cache.ipx,
    getKey: event => `ipx:${event.path}`,
})
