import { Entry, GeneratedExample, ExampleStyle } from "./types";

const STORAGE_KEY = "tiny-study-entries";
const EXAMPLES_KEY = "tiny-study-examples";

// ============ ENTRIES ============

export function getEntries(): Entry[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as Entry[];
  } catch {
    return [];
  }
}

export function saveEntry(entry: Entry): void {
  const entries = getEntries();
  entries.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for browsers without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getEntryById(id: string): Entry | undefined {
  const entries = getEntries();
  return entries.find((e) => e.id === id);
}

export function updateEntry(
  id: string,
  updates: Partial<Pick<Entry, "term" | "sourceSentence" | "meaning" | "nuance" | "type" | "tags" | "repeatFlag" | "masteredFlag" | "lastReviewedAt" | "correctCount" | "incorrectCount">>
): Entry | undefined {
  const entries = getEntries();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return undefined;

  entries[index] = {
    ...entries[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entries[index];
}

export function deleteEntry(id: string): boolean {
  const entries = getEntries();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return false;

  entries.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

  // Also delete associated examples
  const examples = getAllExamples().filter((ex) => ex.entryId !== id);
  localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples));

  return true;
}

// ============ REPEAT / REVIEW ============

export function getRepeatEntries(): Entry[] {
  const entries = getEntries().filter((e) => e.repeatFlag === true);

  // Sort by: least recently reviewed first (missing lastReviewedAt comes first), then by newest
  return entries.sort((a, b) => {
    const aReviewed = a.lastReviewedAt ?? 0;
    const bReviewed = b.lastReviewedAt ?? 0;

    if (aReviewed !== bReviewed) {
      return aReviewed - bReviewed; // Ascending: least recent first
    }

    // If same review time (or both never reviewed), sort by newest first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function getRepeatCount(): number {
  return getEntries().filter((e) => e.repeatFlag === true).length;
}

// ============ MASTERED ============

export function getMasteredEntries(): Entry[] {
  return getEntries().filter((e) => e.masteredFlag === true);
}

export function getMasteredCount(): number {
  return getEntries().filter((e) => e.masteredFlag === true).length;
}

export function recordReview(id: string, correct: boolean): Entry | undefined {
  const entry = getEntryById(id);
  if (!entry) return undefined;

  const currentCorrect = entry.correctCount ?? 0;
  const currentIncorrect = entry.incorrectCount ?? 0;

  return updateEntry(id, {
    lastReviewedAt: Date.now(),
    correctCount: correct ? currentCorrect + 1 : currentCorrect,
    incorrectCount: correct ? currentIncorrect : currentIncorrect + 1,
  });
}

// ============ EXAMPLES ============

function getAllExamples(): GeneratedExample[] {
  const data = localStorage.getItem(EXAMPLES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as GeneratedExample[];
  } catch {
    return [];
  }
}

export function listExamples(entryId: string): GeneratedExample[] {
  return getAllExamples().filter((ex) => ex.entryId === entryId);
}

export function addExamples(
  entryId: string,
  style: ExampleStyle,
  texts: string[]
): GeneratedExample[] {
  const allExamples = getAllExamples();
  const now = new Date().toISOString();

  const newExamples: GeneratedExample[] = texts.map((text) => ({
    id: generateId(),
    entryId,
    text,
    style,
    savedFlag: false,
    createdAt: now,
  }));

  allExamples.push(...newExamples);
  localStorage.setItem(EXAMPLES_KEY, JSON.stringify(allExamples));

  return newExamples;
}

export function updateExample(
  id: string,
  updates: Partial<Pick<GeneratedExample, "savedFlag" | "text">>
): GeneratedExample | undefined {
  const examples = getAllExamples();
  const index = examples.findIndex((ex) => ex.id === id);
  if (index === -1) return undefined;

  examples[index] = {
    ...examples[index],
    ...updates,
  };

  localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples));
  return examples[index];
}

export function deleteExample(id: string): boolean {
  const examples = getAllExamples();
  const index = examples.findIndex((ex) => ex.id === id);
  if (index === -1) return false;

  examples.splice(index, 1);
  localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples));
  return true;
}

// ============ SEARCH ============

export function searchEntries(query: string): Entry[] {
  if (!query.trim()) return getEntries();

  const q = query.toLowerCase().trim();
  return getEntries().filter((entry) => {
    const termMatch = entry.term.toLowerCase().includes(q);
    const meaningMatch = entry.meaning?.toLowerCase().includes(q);
    const sourceMatch = entry.sourceSentence?.toLowerCase().includes(q);
    const tagsMatch = entry.tags?.some((tag) => tag.toLowerCase().includes(q));
    return termMatch || meaningMatch || sourceMatch || tagsMatch;
  });
}
