export function findNextId(items: any[]): number {
    if (items.length === 0) return 1
    const maxId = Math.max(...items.map((o: any) => o.id))
    return maxId + 1
}
