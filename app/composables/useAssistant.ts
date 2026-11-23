/** Общее состояние AI-ассистента: открыт ли чат и какую реплику отправить сразу после открытия. */
export const useAssistant = () => {
    const open = useState('assistant-open', () => false)
    const pending = useState<string | null>('assistant-pending', () => null)

    /** Открыть чат; с `text` — сразу отправить эту реплику от имени посетителя. */
    const ask = (text?: string) => {
        pending.value = text || null
        open.value = true
    }

    return { open, pending, ask }
}
