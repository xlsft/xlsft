import hcaptcha from 'hcaptcha'

export const useCaptcha = (): { verify: (token: string) => Promise<boolean> } => {
    const secret = useRuntimeConfig().hcaptcha.secret

    async function verify(token: string): Promise<boolean> {
        if (import.meta.dev) return true
        return (await hcaptcha.verify(secret, token)).success
    }

    return { verify }
}
