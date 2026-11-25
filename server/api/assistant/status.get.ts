export default defineEventHandler(() => {
    if (!import.meta.dev) throw createError({ status: 404 })
    return useAi().status()
})
