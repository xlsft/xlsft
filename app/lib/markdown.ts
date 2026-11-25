import useMarkdownRemoval from 'remove-markdown'

// remove-markdown mangles escapes (\*\*\* turns into \\\*), so escaped chars are hidden from it and restored after
export const plain = (markdown?: string): string => {
    const escaped: string[] = []
    const hidden = (markdown ?? '').replace(/\\([\\`*_{}[\]()#+\-.!~|>])/g, (_, char: string) => `\u0000${escaped.push(char) - 1}\u0000`)
    return useMarkdownRemoval(hidden).replace(/\u0000(\d+)\u0000/g, (_, index: string) => escaped[Number(index)] ?? '')
}
