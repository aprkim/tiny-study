import { useState } from "react";
import { EntryType, Entry } from "../types";
import { saveEntry, generateId, updateEntry } from "../storage";
import { explainEntry } from "../lib/explain";

interface NewEntryProps {
  onBack: () => void;
  onSaved: () => void;
  onSavedWithId: (id: string) => void;
}

const entryTypes: EntryType[] = ["word", "idiom", "expression", "sentence"];

export default function NewEntry({ onBack, onSaved, onSavedWithId }: NewEntryProps) {
  const [type, setType] = useState<EntryType>("word");
  const [term, setTerm] = useState("");
  const [sourceSentence, setSourceSentence] = useState("");
  const [errors, setErrors] = useState<{ term?: string; sourceSentence?: string }>({});
  const [isExplaining, setIsExplaining] = useState(false);

  const validate = (): boolean => {
    const newErrors: { term?: string; sourceSentence?: string } = {};

    if (!term.trim()) {
      newErrors.term = "Term is required";
    }

    if (type === "word" && !sourceSentence.trim()) {
      newErrors.sourceSentence = "Source sentence is required for words";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createEntry = (): Entry => {
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
    const entry = createEntry();
    saveEntry(entry);
    onSaved();
  };

  const handleSaveAndExplain = async () => {
    if (!validate()) return;

    setIsExplaining(true);

    try {
      const entry = createEntry();
      saveEntry(entry);

      // Generate explanation
      const { meaning, nuance } = await explainEntry({
        type: entry.type,
        term: entry.term,
        sourceSentence: entry.sourceSentence,
      });

      // Update entry with explanation
      updateEntry(entry.id, { meaning, nuance });

      // Navigate to detail page
      onSavedWithId(entry.id);
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
        <div className="flex gap-1 p-1 bg-[#f0f4f3] rounded-2xl">
          {entryTypes.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              disabled={isExplaining}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl capitalize transition-colors ${
                type === t
                  ? "bg-white text-[#1e293b] shadow-sm"
                  : "text-[#64748b] hover:text-[#1e293b]"
              } ${isExplaining ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Term Input */}
        <div>
          <label className="block text-sm font-medium text-[#1e293b] mb-2">
            Term
          </label>
          <input
            type="text"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              if (errors.term) setErrors((prev) => ({ ...prev, term: undefined }));
            }}
            disabled={isExplaining}
            placeholder="Enter term..."
            className={`w-full px-4 py-3 bg-white border rounded-2xl text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143] focus:border-transparent transition-all ${
              errors.term ? "border-[#BF3143]" : "border-[#e2e8f0]"
            } ${isExplaining ? "opacity-50" : ""}`}
          />
          {errors.term && (
            <p className="mt-2 text-sm text-[#BF3143]">{errors.term}</p>
          )}
        </div>

        {/* Source Sentence Input (conditional) */}
        {type === "word" && (
          <div>
            <label className="block text-sm font-medium text-[#1e293b] mb-2">
              Source Sentence
            </label>
            <textarea
              value={sourceSentence}
              onChange={(e) => {
                setSourceSentence(e.target.value);
                if (errors.sourceSentence)
                  setErrors((prev) => ({ ...prev, sourceSentence: undefined }));
              }}
              disabled={isExplaining}
              placeholder="Enter the sentence where you found this word..."
              rows={3}
              className={`w-full px-4 py-3 bg-white border rounded-2xl text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143] focus:border-transparent transition-all resize-none ${
                errors.sourceSentence ? "border-[#BF3143]" : "border-[#e2e8f0]"
              } ${isExplaining ? "opacity-50" : ""}`}
            />
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
            className="w-full px-4 py-3 bg-[#BF3143] text-white rounded-2xl font-medium hover:bg-[#a52a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExplaining ? "Explaining..." : "Save + Explain"}
          </button>
          <button
            onClick={handleSave}
            disabled={isExplaining}
            className="w-full px-4 py-3 bg-[#f0f4f3] text-[#1e293b] rounded-2xl font-medium hover:bg-[#e2e8f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Only
          </button>
        </div>
      </div>
    </div>
  );
}
