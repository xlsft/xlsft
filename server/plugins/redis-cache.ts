import redisDriver from 'unstorage/drivers/redis'

export default defineNitroPlugin(() => {
    const url = useRuntimeConfig().redis.url
    if (!url.length) return
    useStorage().mount('cache:binary', redisDriver({ url }))
})
