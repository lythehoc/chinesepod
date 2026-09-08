import lessonData from "../data/lessons.json";

export const LEVELS = ["Foundations", "Beginner", "Everyday"] as const;

export type DialogueLine = {
  speaker: string;
  hanzi: string;
  pinyin: string;
  vietnamese: string;
};

export type VocabularyItem = {
  hanzi: string;
  pinyin: string;
  vietnamese: string;
};

export type Lesson = {
  id: number;
  title: string;
  hanzi: string;
  pinyin: string;
  level: (typeof LEVELS)[number];
  description: string;
  dialogue: DialogueLine[];
  vocabulary: VocabularyItem[];
  note: { title: string; body: string };
};

export const lessons: Lesson[] = lessonData as Lesson[];

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

export function matchesLesson(lesson: Lesson, query: string): boolean {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const searchableFields = [
    String(lesson.id),
    lesson.title,
    lesson.hanzi,
    lesson.pinyin,
    lesson.level,
    lesson.description,
    ...lesson.vocabulary.flatMap(({ hanzi, pinyin, vietnamese }) => [
      hanzi,
      pinyin,
      vietnamese,
    ]),
    ...lesson.dialogue.flatMap(({ hanzi, pinyin, vietnamese }) => [
      hanzi,
      pinyin,
      vietnamese,
    ]),
  ];

  return searchableFields.some((field) =>
    normalizeSearch(field).includes(normalizedQuery),
  );
}
