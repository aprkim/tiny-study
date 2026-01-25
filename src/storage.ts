import { Entry, GeneratedExample, ExampleStyle } from "./types";
import { auth, db } from "./lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";

function getUserId(): string {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("User not authenticated");
  return userId;
}

// ============ ENTRIES ============

export async function getEntries(): Promise<Entry[]> {
  const userId = getUserId();
  const q = query(
    collection(db, "users", userId, "entries"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ ...doc.data() } as Entry));
}

export async function saveEntry(entry: Entry): Promise<void> {
  const userId = getUserId();
  await setDoc(doc(db, "users", userId, "entries", entry.id), entry);
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

export async function getEntryById(id: string): Promise<Entry | undefined> {
  const userId = getUserId();
  const docSnap = await getDoc(doc(db, "users", userId, "entries", id));
  if (!docSnap.exists()) return undefined;
  return docSnap.data() as Entry;
}

export async function updateEntry(
  id: string,
  updates: Partial<
    Pick<
      Entry,
      | "term"
      | "sourceSentence"
      | "meaning"
      | "nuance"
      | "type"
      | "tags"
      | "repeatFlag"
      | "masteredFlag"
      | "lastReviewedAt"
      | "correctCount"
      | "incorrectCount"
      | "termTranslation"
      | "sourceTranslation"
    >
  >
): Promise<Entry | undefined> {
  const userId = getUserId();
  const entryRef = doc(db, "users", userId, "entries", id);
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) return undefined;

  const updated = {
    ...entrySnap.data(),
    ...updates,
    updatedAt: new Date().toISOString(),
  } as Entry;

  await setDoc(entryRef, updated);
  return updated;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const userId = getUserId();

  // Delete entry
  await deleteDoc(doc(db, "users", userId, "entries", id));

  // Also delete associated examples
  const examplesQuery = query(collection(db, "users", userId, "examples"));
  const snapshot = await getDocs(examplesQuery);
  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnap) => {
    const example = docSnap.data() as GeneratedExample;
    if (example.entryId === id) {
      batch.delete(docSnap.ref);
    }
  });

  await batch.commit();
  return true;
}

// ============ REPEAT / REVIEW ============

export async function getRepeatEntries(): Promise<Entry[]> {
  const entries = await getEntries();
  const repeatEntries = entries.filter((e) => e.repeatFlag === true);

  // Sort by: least recently reviewed first (missing lastReviewedAt comes first), then by newest
  return repeatEntries.sort((a, b) => {
    const aReviewed = a.lastReviewedAt ?? 0;
    const bReviewed = b.lastReviewedAt ?? 0;

    if (aReviewed !== bReviewed) {
      return aReviewed - bReviewed; // Ascending: least recent first
    }

    // If same review time (or both never reviewed), sort by newest first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getRepeatCount(): Promise<number> {
  const entries = await getEntries();
  return entries.filter((e) => e.repeatFlag === true).length;
}

// ============ MASTERED ============

export async function getMasteredEntries(): Promise<Entry[]> {
  const entries = await getEntries();
  return entries.filter((e) => e.masteredFlag === true);
}

export async function getMasteredCount(): Promise<number> {
  const entries = await getEntries();
  return entries.filter((e) => e.masteredFlag === true).length;
}

export async function recordReview(
  id: string,
  correct: boolean
): Promise<Entry | undefined> {
  const entry = await getEntryById(id);
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

async function getAllExamples(): Promise<GeneratedExample[]> {
  const userId = getUserId();
  const q = query(
    collection(db, "users", userId, "examples"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as GeneratedExample);
}

export async function listExamples(entryId: string): Promise<GeneratedExample[]> {
  const examples = await getAllExamples();
  return examples.filter((ex) => ex.entryId === entryId);
}

export async function addExamples(
  entryId: string,
  style: ExampleStyle,
  texts: string[]
): Promise<GeneratedExample[]> {
  const userId = getUserId();
  const now = new Date().toISOString();

  const newExamples: GeneratedExample[] = texts.map((text) => ({
    id: generateId(),
    entryId,
    text,
    style,
    savedFlag: false,
    createdAt: now,
  }));

  const batch = writeBatch(db);
  for (const example of newExamples) {
    batch.set(doc(db, "users", userId, "examples", example.id), example);
  }
  await batch.commit();

  return newExamples;
}

export async function updateExample(
  id: string,
  updates: Partial<Pick<GeneratedExample, "savedFlag" | "text" | "translation">>
): Promise<GeneratedExample | undefined> {
  const userId = getUserId();
  const exampleRef = doc(db, "users", userId, "examples", id);
  const exampleSnap = await getDoc(exampleRef);
  if (!exampleSnap.exists()) return undefined;

  const updated = {
    ...exampleSnap.data(),
    ...updates,
  } as GeneratedExample;

  await setDoc(exampleRef, updated);
  return updated;
}

export async function deleteExample(id: string): Promise<boolean> {
  const userId = getUserId();
  await deleteDoc(doc(db, "users", userId, "examples", id));
  return true;
}

// ============ BULK OPERATIONS (for import/export) ============

export async function getAllExamplesForExport(): Promise<GeneratedExample[]> {
  const userId = getUserId();
  const q = query(collection(db, "users", userId, "examples"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as GeneratedExample);
}

export async function saveEntries(entries: Entry[]): Promise<void> {
  const userId = getUserId();
  const batch = writeBatch(db);
  for (const entry of entries) {
    batch.set(doc(db, "users", userId, "entries", entry.id), entry);
  }
  await batch.commit();
}

export async function saveExamples(examples: GeneratedExample[]): Promise<void> {
  const userId = getUserId();
  const batch = writeBatch(db);
  for (const example of examples) {
    batch.set(doc(db, "users", userId, "examples", example.id), example);
  }
  await batch.commit();
}

// ============ SEARCH ============

export async function searchEntries(searchQuery: string): Promise<Entry[]> {
  const entries = await getEntries();
  if (!searchQuery.trim()) return entries;

  const q = searchQuery.toLowerCase().trim();
  return entries.filter((entry) => {
    const termMatch = entry.term.toLowerCase().includes(q);
    const meaningMatch = entry.meaning?.toLowerCase().includes(q);
    const sourceMatch = entry.sourceSentence?.toLowerCase().includes(q);
    const tagsMatch = entry.tags?.some((tag) => tag.toLowerCase().includes(q));
    return termMatch || meaningMatch || sourceMatch || tagsMatch;
  });
}
