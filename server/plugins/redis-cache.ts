import redisDriver from 'unstorage/drivers/redis'

/**
 * Если задан REDIS_URL — монтируем Redis под namespace `cache:binary`
 * (OG-картинки и docx, см. server/utils/useCachedBinary.ts):
 * самые дорогие рендеры становятся общими для всех воркеров node-cluster
 * и переживают рестарты. Поверх Redis в воркере есть быстрый in-memory L1.
 *
 * Страницы и прочий nitro-кэш намеренно остаются в памяти воркера:
 * RTT до удалённого Redis (~180мс, до ~1с на cache hit с метаданными)
 * на порядки медленнее памяти (~3мс) и душит RPS.
 * Без REDIS_URL всё работает на дефолтном in-memory кэше.
 */
export default defineNitroPlugin(() => {
    const url = process.env.REDIS_URL
    if (!url) return

    const storage = useStorage()
    storage.mount('cache:binary', redisDriver({ url }))
})
