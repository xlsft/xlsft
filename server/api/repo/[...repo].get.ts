export default defineEventHandler(async (event) => { try {
    const path = getRouterParam(event, 'repo')
    if (!path) throw createError({ statusCode: 400, statusMessage: 'Missing repo path' })
    const url = new URL(`https://api.github.com/repos/${path}`)

    const response = await $fetch<{ stargazers_count: number, topics: string[] }>(url.toString(), { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }})
    return {
        starts: response.stargazers_count,
        topics: response.topics
    }
} catch (error: any) { throw createError({
    statusCode: error?.response?.status || 500,
    statusMessage: error?.response?._data?.message || 'GitHub request failed',
})}})