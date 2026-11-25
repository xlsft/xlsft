export const byPriority = (a: { name: string, priority?: number }, b: { name: string, priority?: number }): number =>
    (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name)
