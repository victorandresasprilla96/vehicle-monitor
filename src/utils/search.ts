/** Lowercase and strip accents: "Camión" and "camion" match. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Every word of the query must appear in the text ("cam 02" → "Camión 02"). */
export function matchesQuery(text: string, query: string): boolean {
  const haystack = normalizeForSearch(text)
  return normalizeForSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}
