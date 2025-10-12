export class Debouncer {
    private timeouts: Record<string, NodeJS.Timeout> = {}
    constructor(private wait: number) {}
    use(action: () => void, id: string = 'global') {
        clearTimeout(this.timeouts[id])
        this.timeouts[id] = setTimeout(() => action(), this.wait)
    }
    clear(id: string = 'global') {
        clearTimeout(this.timeouts[id])
    }
}