export type PublicLine = { hanzi: string; pinyin: string; english: string; audioUrl: string | null };
export type PublicLesson = { dialogue: PublicLine[]; keyVocabulary: PublicLine[]; supplementaryVocabulary: PublicLine[] };

/** Read only the publisher's anonymous preview. Never insert source HTML or scripts. */
export function parsePublicLesson(document: Document): PublicLesson {
  const text = (element: Element | null) => element?.textContent?.trim() ?? "";
  const audioUrl = (element: Element) => {
    const raw = element.querySelector("[audio]")?.getAttribute("audio");
    if (!raw) return null;
    try { const url = new URL(raw); return url.protocol === "https:" && url.hostname === "s3contents.chinesepod.com" ? url.href : null; } catch { return null; }
  };
  const dialogue = Array.from(document.querySelectorAll(".sentences-card .sentences")).slice(0, 100).map((row) => {
    const cells = row.querySelectorAll(".sentence > span");
    return { hanzi: text(cells[0]), pinyin: text(cells[1]), english: text(cells[2]), audioUrl: audioUrl(row) };
  });
  const vocabulary = Array.from(document.querySelectorAll(".vocabulary-table tbody tr")).slice(0, 100).map((row) => {
    const cells = row.querySelectorAll("td");
    return { hanzi: text(cells[0]), pinyin: text(cells[1]), english: text(cells[2]), audioUrl: audioUrl(row) };
  });
  const complete = (line: PublicLine) => /\p{Script=Han}/u.test(line.hanzi) && !!line.pinyin && !!line.english;
  const completeVocabulary = vocabulary.filter(complete);
  const keyCount = completeVocabulary.length > 1 ? Math.ceil(completeVocabulary.length * 0.6) : completeVocabulary.length;
  return { dialogue: dialogue.filter(complete), keyVocabulary: completeVocabulary.slice(0, keyCount), supplementaryVocabulary: completeVocabulary.slice(keyCount) };
}
