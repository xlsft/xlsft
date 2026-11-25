// OG images are rendered outside the page CSS, so theme tokens from assets/css/theme.css are resolved to hex here

export type OgTheme = 'dark' | 'light'

export interface OgRow { key: string, value: string }

export interface OgColors { bg: string, text: string, value: string, border: string, comment: string, dimmed: string }

export const palette = {
    primary: '#2b7fff',
    info: '#00b8db',
    success: '#00bc7d',
    warning: '#ff6900',
    error: '#ff2056',
    purple: '#ad46ff',
    amber: '#fe9a00',
    indigo: '#615fff',
}

export const themes: Record<OgTheme, OgColors> = {
    dark: { bg: '#000000', text: '#ffffff', value: '#c7c7c7', border: '#404040', comment: '#767676', dimmed: '#9e9e9e' },
    light: { bg: '#ffffff', text: '#000000', value: '#383838', border: '#c2c2c2', comment: '#767676', dimmed: '#595959' },
}

// the same order as fetch-rows in theme.css
export const rows = [palette.error, palette.warning, palette.success, palette.info, palette.primary, palette.purple]

export const swatches = (colors: OgColors): string[] => [colors.border, palette.success, palette.amber, palette.error, palette.info, palette.primary, palette.indigo, colors.text]

// bg-grid from theme.css
export const grid = (colors: OgColors): Record<string, string> => ({
    backgroundImage: `linear-gradient(${colors.border}99 1px, transparent 1px), linear-gradient(90deg, ${colors.border}99 1px, transparent 1px)`,
    backgroundSize: '24px 24px',
    backgroundPosition: 'center',
})

// CommonHighlight syntax without links: \0 + color char starts a token
export const tokens = (text: string, colors: OgColors): { text: string, color: string }[] => {
    const map: Record<string, string> = { o: colors.text, d: colors.dimmed, c: colors.comment, p: palette.primary, i: palette.info, w: palette.warning, e: palette.error, s: palette.success }
    return text.split('\0').map((chunk, index) => ({
        color: map[index === 0 ? 'o' : chunk.charAt(0)] ?? colors.text,
        text: index === 0 ? chunk : chunk.slice(1),
    })).filter((token) => token.text.length > 0)
}
