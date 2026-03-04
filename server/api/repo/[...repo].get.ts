export default defineEventHandler(async (event) => {
    const path = getRouterParam(event, 'repo')
    if (!path) throw createError({ statusCode: 400, statusMessage: 'Missing GitHub path' })
    const query = getQuery(event)
    const url = new URL(`https://api.github.com/repos/${path}`)
    Object.entries(query).forEach(([key, value]) => { if (value) url.searchParams.append(key, String(value)) })

    try {
        const response = await $fetch(url.toString(), {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            },
        })
        return response
    } catch (error: any) { throw createError({
        statusCode: error?.response?.status || 500,
        statusMessage: error?.response?._data?.message || 'GitHub request failed',
    }) }
})