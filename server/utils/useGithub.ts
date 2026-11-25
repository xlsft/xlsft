export interface GithubStats { stars: number, forks: number, topics: string[], language?: string, pushed?: string }

const cached = defineCachedFunction(async (repo: string, token: string): Promise<GithubStats | undefined> => {
    try {
        const response = await $fetch<{ stargazers_count: number, forks_count: number, topics?: string[], language?: string, pushed_at?: string }>(`https://api.github.com/repos/${repo}`, {
            headers: { Accept: 'application/vnd.github+json', ...token.length ? { Authorization: `Bearer ${token}` } : {} },
            timeout: 5000,
        })
        return { stars: response.stargazers_count, forks: response.forks_count, topics: response.topics ?? [], language: response.language, pushed: response.pushed_at?.slice(0, 10) }
    } catch {
        return undefined
    }
}, { maxAge: 3600, swr: true, staleMaxAge: 86400, group: 'chat', name: 'github-stats', getKey: (repo: string) => repo.replace(/[^\w.-]/g, '_') })

export const useGithub = (): { stats: (repo: string) => Promise<GithubStats | undefined> } => {
    const token = useRuntimeConfig().github.token
    return { stats: (repo) => cached(repo, token) }
}
