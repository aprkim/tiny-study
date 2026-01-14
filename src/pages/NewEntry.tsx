import { useState } from "react";
import { EntryType, Entry } from "../types";
import { saveEntry, generateId, updateEntry } from "../storage";
import { explainEntry } from "../lib/explain";
import { translateToKorean } from "../lib/translate";

interface NewEntryProps {
  onBack: () => void;
  onSaved: () => void;
  onSavedWithId: (id: string) => void;
}

const entryTypes: EntryType[] = ["word", "idiom", "expression", "sentence"];

export default function NewEntry({ onBack, onSaved, onSavedWithId }: NewEntryProps) {
  const [type, setType] = useState<EntryType>("word");
  const [terms, setTerms] = useState<string[]>([""]);
  const [sourceSentence, setSourceSentence] = useState("");
  const [errors, setErrors] = useState<{ terms?: Record<number, string>; sourceSentence?: string }>({});
  const [isExplaining, setIsExplaining] = useState(false);
  const [termTranslations, setTermTranslations] = useState<Record<number, string>>({});
  const [sentenceTranslation, setSentenceTranslation] = useState("");
  const [isTranslatingTerm, setIsTranslatingTerm] = useState<Record<number, boolean>>({});
  const [isTranslatingSentence, setIsTranslatingSentence] = useState(false);

  const handleTranslateTerm = async (index: number) => {
    const term = terms[index];
    if (!term.trim()) return;

    setIsTranslatingTerm((prev) => ({ ...prev, [index]: true }));
    try {
      const translation = await translateToKorean(term, sourceSentence || undefined);
      setTermTranslations((prev) => ({ ...prev, [index]: translation }));
    } finally {
      setIsTranslatingTerm((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleTranslateSentence = async () => {
    if (!sourceSentence.trim()) return;

    setIsTranslatingSentence(true);
    try {
      const translation = await translateToKorean(sourceSentence);
      setSentenceTranslation(translation);
    } finally {
      setIsTranslatingSentence(false);
    }
  };

  const addTermField = () => {
    setTerms((prev) => [...prev, ""]);
  };

  const removeTermField = (index: number) => {
    if (terms.length > 1) {
      setTerms((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateTerm = (index: number, value: string) => {
    setTerms((prev) => prev.map((t, i) => (i === index ? value : t)));
    if (errors.terms?.[index]) {
      const newTermErrors = { ...errors.terms };
      delete newTermErrors[index];
      setErrors((prev) => ({
        ...prev,
        terms: Object.keys(newTermErrors).length > 0 ? newTermErrors : undefined,
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: { terms?: Record<number, string>; sourceSentence?: string } = {};
    const termErrors: Record<number, string> = {};

    terms.forEach((t, i) => {
      if (!t.trim()) {
        termErrors[i] = "Term is required";
      }
    });

    if (Object.keys(termErrors).length > 0) {
      newErrors.terms = termErrors;
    }

    if (type === "word" && !sourceSentence.trim()) {
      newErrors.sourceSentence = "Source sentence is required for words";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createEntry = (term: string): Entry => {
    return {
      id: generateId(),
      type,
      term: term.trim(),
      sourceSentence: type === "word" ? sourceSentence.trim() : undefined,
      createdAt: new Date().toISOString(),
    };
  };

  const handleSave = () => {
    if (!validate()) return;
    terms.forEach((t) => {
      if (t.trim()) {
        const entry = createEntry(t);
        saveEntry(entry);
      }
    });
    onSaved();
  };

  const handleSaveAndExplain = async () => {
    if (!validate()) return;

    setIsExplaining(true);

    try {
      // Save all entries first
      const entries: Entry[] = [];
      terms.forEach((t) => {
        if (t.trim()) {
          const entry = createEntry(t);
          saveEntry(entry);
          entries.push(entry);
        }
      });

      // Generate explanation for the first entry and navigate to it
      if (entries.length > 0) {
        const firstEntry = entries[0];
        const { meaning, nuance } = await explainEntry({
          type: firstEntry.type,
          term: firstEntry.term,
          sourceSentence: firstEntry.sourceSentence,
        });

        updateEntry(firstEntry.id, { meaning, nuance });
        onSavedWithId(firstEntry.id);
      }
    } catch (error) {
      console.error("Failed to explain:", error);
      setIsExplaining(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="text-[#64748b] hover:text-[#1e293b] transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold text-[#1e293b]">Add New</h1>
      </header>

      <div className="space-y-6">
        {/* Segmented Control */}
        <div className="flex gap-1 p-1 bg-[#f0f4f3] rounded-lg">
          {entryTypes.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              disabled={isExplaining}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                type === t
                  ? "bg-white text-[#1e293b] shadow-sm"
                  : "text-[#64748b] hover:text-[#1e293b]"
              } ${isExplaining ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Term Input(s) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-[#1e293b]">
              Term{terms.length > 1 ? "s" : ""}
            </label>
            <button
              type="button"
              onClick={addTermField}
              disabled={isExplaining}
              className="flex items-center gap-1 text-sm text-[#BF3143] hover:text-[#a52a3a] disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              Add
            </button>
          </div>
          <div className="space-y-3">
            {terms.map((t, index) => (
              <div key={index} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={t}
                    onChange={(e) => updateTerm(index, e.target.value)}
                    disabled={isExplaining}
                    placeholder="Enter term..."
                    className={`flex-1 px-4 py-3 bg-white border rounded-lg text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143] focus:border-transparent transition-all ${
                      errors.terms?.[index] ? "border-[#BF3143]" : "border-[#e2e8f0]"
                    } ${isExplaining ? "opacity-50" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleTranslateTerm(index)}
                    disabled={isExplaining || isTranslatingTerm[index] || !t.trim()}
                    className="px-3 text-[#6E6282] hover:text-[#BF3143] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Translate to Korean"
                  >
                    {isTranslatingTerm[index] ? (
                      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 8 6 6" />
                        <path d="m4 14 6-6 2-3" />
                        <path d="M2 5h12" />
                        <path d="M7 2h1" />
                        <path d="m22 22-5-10-5 10" />
                        <path d="M14 18h6" />
                      </svg>
                    )}
                  </button>
                  {terms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTermField(index)}
                      disabled={isExplaining}
                      className="px-3 text-[#9CA3AF] hover:text-[#BF3143] disabled:opacity-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12h8" />
                      </svg>
                    </button>
                  )}
                </div>
                {termTranslations[index] && (
                  <p className="text-sm text-[#6E6282] bg-[#F7F5FA] px-3 py-2 rounded-lg">
                    {termTranslations[index]}
                  </p>
                )}
              </div>
            ))}
          </div>
          {errors.terms && Object.keys(errors.terms).length > 0 && (
            <p className="mt-2 text-sm text-[#BF3143]">Please fill in all term fields</p>
          )}
        </div>

        {/* Source Sentence Input (conditional) */}
        {type === "word" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[#1e293b]">
                Source Sentence
              </label>
              <button
                type="button"
                onClick={handleTranslateSentence}
                disabled={isExplaining || isTranslatingSentence || !sourceSentence.trim()}
                className="flex items-center gap-1 text-sm text-[#6E6282] hover:text-[#BF3143] disabled:opacity-50 disabled:cursor-not-allowed"
                title="Translate to Korean"
              >
                {isTranslatingSentence ? (
                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 8 6 6" />
                    <path d="m4 14 6-6 2-3" />
                    <path d="M2 5h12" />
                    <path d="M7 2h1" />
                    <path d="m22 22-5-10-5 10" />
                    <path d="M14 18h6" />
                  </svg>
                )}
                <span>Translate</span>
              </button>
            </div>
            <textarea
              value={sourceSentence}
              onChange={(e) => {
                setSourceSentence(e.target.value);
                setSentenceTranslation("");
                if (errors.sourceSentence)
                  setErrors((prev) => ({ ...prev, sourceSentence: undefined }));
              }}
              disabled={isExplaining}
              placeholder="Enter the sentence where you found this word..."
              rows={3}
              className={`w-full px-4 py-3 bg-white border rounded-lg text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143] focus:border-transparent transition-all resize-none ${
                errors.sourceSentence ? "border-[#BF3143]" : "border-[#e2e8f0]"
              } ${isExplaining ? "opacity-50" : ""}`}
            />
            {sentenceTranslation && (
              <p className="mt-2 text-sm text-[#6E6282] bg-[#F7F5FA] px-3 py-2 rounded-lg">
                {sentenceTranslation}
              </p>
            )}
            {errors.sourceSentence && (
              <p className="mt-2 text-sm text-[#BF3143]">{errors.sourceSentence}</p>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSaveAndExplain}
            disabled={isExplaining}
            className="w-full px-4 py-3 bg-[#BF3143] text-white rounded-lg font-medium hover:bg-[#a52a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExplaining ? "Explaining..." : "Save + Explain"}
          </button>
          <button
            onClick={handleSave}
            disabled={isExplaining}
            className="w-full px-4 py-3 bg-[#f0f4f3] text-[#1e293b] rounded-lg font-medium hover:bg-[#e2e8f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Only
          </button>
        </div>
      </div>
    </div>
  );
}
