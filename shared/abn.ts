const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/** Validate an ABN's check digits locally — no network call. */
export function isValidAbn(abn: string): boolean {
    const digits = abn.replace(/\D/g, "").split("").map(Number);
    if (digits.length !== 11) return false;
    digits[0] -= 1;
    const total = digits.reduce((sum, n, i) => sum + n * ABN_WEIGHTS[i], 0);
    return total % 89 === 0;
}