/**
 * Резюме (md, docx, pdf) кэшируются на 3 дня, но после перезапуска контейнера должны собираться заново:
 * свежий деплой или правки в CMS подхватываются рестартом. In-memory кэш умирает вместе с процессом сам,
 * а `cache:binary` при REDIS_URL живёт в Redis — его ключи резюме чистим на старте.
 * Плагин идёт после redis-cache.ts (по алфавиту), поэтому Redis к этому моменту уже смонтирован.
 */
export default defineNitroPlugin(async () => {
    const storage = useStorage('cache:binary')
    const keys = await storage.getKeys().catch(() => [] as string[])
    await Promise.all(keys.filter(key => /^cv-(docx|pdf|png):/.test(key)).map(key => storage.removeItem(key).catch(() => undefined)))
})
