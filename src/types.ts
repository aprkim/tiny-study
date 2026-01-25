export type EntryType = "word" | "idiom" | "expression" | "sentence";

export type ExampleStyle = "neutral" | "casual" | "formal" | "work" | "daily" | "short";

export interface Entry {
  id: string;
  type: EntryType;
  term: string;
  sourceSentence?: string;
  meaning?: string;
  nuance?: string;
  tags?: string[];
  repeatFlag?: boolean;
  masteredFlag?: boolean;
  lastReviewedAt?: number;
  correctCount?: number;
  incorrectCount?: number;
  termTranslation?: string;
  sourceTranslation?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GeneratedExample {
  id: string;
  entryId: string;
  text: string;
  style: ExampleStyle;
  savedFlag: boolean;
  translation?: string;
  createdAt: string;
}
