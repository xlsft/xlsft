/** Состояние моделей ассистента (какие живы, задержки, ошибки). Только в dev: на проде отдаёт 404. */
export default defineEventHandler(() => {
    if (process.env.NODE_ENV !== 'development') throw createError({ status: 404 })
    return useAiRegistry().status()
})
