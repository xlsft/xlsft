import hcaptcha from 'hcaptcha'

export const useCaptcha = () => {
    return {
        verify: async (token: string) => process.env.NODE_ENV === 'development' ? true : (await hcaptcha.verify(process.env.HCAPTCHA_TOKEN!, token)).success
    }
}