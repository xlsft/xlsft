export const useNumberCase = (number: number, one: string, some: string, many: string): string => {
    const n = Math.abs(number) % 100, n1 = n % 10;
    if ((n > 10 && n < 20) || n === 0) return `${number} ${many}`
    if (n1 > 1 && n1 < 5) return `${number} ${some}`
    if (n1 === 1) return `${number} ${one}`
    return `${number} ${many}`;
}
