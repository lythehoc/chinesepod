/** Make tone-marked, plain, and unspaced pinyin searchable alongside Hanzi. */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    // Preserve the distinction between u and ü before removing tone marks.
    .replace(/u[\u0300-\u036f]*\u0308[\u0300-\u036f]*/g, "v")
    .replace(/u:/g, "v")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}
