import { useState } from "react";
import { Entry } from "../types";
import { saveEntry, generateId, updateEntry } from "../storage";
import { explainEntry } from "../lib/explain";
import { TrialExhaustedError } from "../lib/aiService";

interface NewEntryProps {
  onSaved: () => void;
  onSavedWithIds: (ids: string[]) => void;
  onNavigateSettings: () => void;
}

type Mode = "learn" | "capture";

export default function NewEntry({ onSaved, onSavedWithIds, onNavigateSettings }: NewEntryProps) {
  const [mode, setMode] = useState<Mode>("learn");
  const [terms, setTerms] = useState<string[]>([""]);
  const [sourceSentence, setSourceSentence] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [errors, setErrors] = useState<{ terms?: Record<number, string>; sourceSentence?: string; captureText?: string }>({});
  const [isExplaining, setIsExplaining] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showTrialExhausted, setShowTrialExhausted] = useState(false);

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

  const validateLearn = (): boolean => {
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

    if (!sourceSentence.trim()) {
      newErrors.sourceSentence = "Source sentence is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCapture = (): boolean => {
    if (!captureText.trim()) {
      setErrors({ captureText: "Please enter something to save" });
      return false;
    }
    setErrors({});
    return true;
  };

  const createLearnEntry = (term: string): Entry => {
    return {
      id: generateId(),
      type: "word",
      term: term.trim(),
      sourceSentence: sourceSentence.trim(),
      createdAt: new Date().toISOString(),
    };
  };

  const createCaptureEntry = (): Entry => {
    return {
      id: generateId(),
      type: "expression",
      term: captureText.trim(),
      createdAt: new Date().toISOString(),
    };
  };

  const handleSave = async () => {
    if (mode === "learn") {
      if (!validateLearn()) return;
      for (const t of terms) {
        if (t.trim()) {
          const entry = createLearnEntry(t);
          await saveEntry(entry);
        }
      }
      setTerms([""]);
      setSourceSentence("");
    } else {
      if (!validateCapture()) return;
      const entry = createCaptureEntry();
      await saveEntry(entry);
      setCaptureText("");
    }
    setErrors({});
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleSaveAndExplain = async () => {
    if (!validateLearn()) return;

    setIsExplaining(true);

    try {
      const entries: Entry[] = [];
      for (const t of terms) {
        if (t.trim()) {
          const entry = createLearnEntry(t);
          await saveEntry(entry);
          entries.push(entry);
        }
      }

      if (entries.length > 0) {
        // Explain all entries
        for (const entry of entries) {
          const { meaning, nuance } = await explainEntry({
            type: entry.type,
            term: entry.term,
            sourceSentence: entry.sourceSentence,
          });
          await updateEntry(entry.id, { meaning, nuance });
        }

        onSavedWithIds(entries.map((e) => e.id));
      }
    } catch (error) {
      if (error instanceof TrialExhaustedError) {
        setShowTrialExhausted(true);
        // Still navigate to the entries (they were saved, just without explanations)
        if (terms.filter((t) => t.trim()).length > 0) {
          onSaved();
        }
        return;
      }
      console.error("Failed to explain:", error);
      setIsExplaining(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Add New</h1>
      </header>

      <div className="space-y-6">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("learn")}
            disabled={isExplaining}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mode === "learn"
                ? "bg-[#F7F5FA] text-[#6E6282] border border-[#6E6282]"
                : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#64748b]"
            } ${isExplaining ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Learn
          </button>
          <button
            onClick={() => setMode("capture")}
            disabled={isExplaining}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mode === "capture"
                ? "bg-[#F4F7F4] text-[#5C6D5F] border border-[#5C6D5F]"
                : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#64748b]"
            } ${isExplaining ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Make It Mine
          </button>
        </div>

        {/* Learn Mode */}
        {mode === "learn" && (
          <>
            {/* Source Sentence Input */}
            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-2">
                Source Sentence
              </label>
              <textarea
                value={sourceSentence}
                onChange={(e) => {
                  setSourceSentence(e.target.value.trim());
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
              {errors.sourceSentence && (
                <p className="mt-2 text-sm text-[#BF3143]">{errors.sourceSentence}</p>
              )}
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
                  <div key={index} className="flex gap-2">
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
                ))}
              </div>
              {errors.terms && Object.keys(errors.terms).length > 0 && (
                <p className="mt-2 text-sm text-[#BF3143]">Please fill in all term fields</p>
              )}
            </div>

            {/* Learn Mode Buttons */}
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
                disabled={isExplaining || showSaved}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                  showSaved
                    ? "bg-[#E7F1EB] text-[#3F6B52]"
                    : "bg-[#f0f4f3] text-[#1e293b] hover:bg-[#e2e8f0] disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {showSaved ? "Saved" : "Save Only"}
              </button>
            </div>
          </>
        )}

        {/* Capture Mode (Make It Mine) */}
        {mode === "capture" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-2">
                Capture
              </label>
              <textarea
                value={captureText}
                onChange={(e) => {
                  setCaptureText(e.target.value.trim());
                  if (errors.captureText)
                    setErrors((prev) => ({ ...prev, captureText: undefined }));
                }}
                placeholder="Paste a sentence or expression you want to remember..."
                rows={5}
                className={`w-full px-4 py-3 bg-white border rounded-lg text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143] focus:border-transparent transition-all resize-none ${
                  errors.captureText ? "border-[#BF3143]" : "border-[#e2e8f0]"
                }`}
              />
              {errors.captureText && (
                <p className="mt-2 text-sm text-[#BF3143]">{errors.captureText}</p>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={showSaved}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                showSaved
                  ? "bg-[#E7F1EB] text-[#3F6B52]"
                  : "bg-[#BF3143] text-white hover:bg-[#a52a3a]"
              }`}
            >
              {showSaved ? "Saved" : "Save"}
            </button>
          </>
        )}
      </div>

      {/* Trial Exhausted Modal */}
      {showTrialExhausted && (
        <div className="fixed inset-0 bg-[rgba(30,41,59,0.5)] flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#1e293b] mb-2">
              Free Trial Used Up
            </h3>
            <p className="text-[#64748b] mb-5">
              You've used all 20 free AI requests. Your entry was saved, but without AI explanation. To keep using AI features:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowTrialExhausted(false);
                  onNavigateSettings();
                }}
                className="w-full text-left bg-[#F7F5FA] rounded-lg p-3 hover:bg-[#eee9f3] transition-colors"
              >
                <p className="font-medium text-[#1e293b] text-sm">Add your own API key</p>
                <p className="text-xs text-[#64748b] mt-1">
                  Get a key from console.anthropic.com and add it in Settings.
                </p>
              </button>
              <button
                onClick={() => {
                  setShowTrialExhausted(false);
                  onNavigateSettings();
                }}
                className="w-full text-left bg-[#E7F1EB] rounded-lg p-3 hover:bg-[#d4e8dc] transition-colors"
              >
                <p className="font-medium text-[#1e293b] text-sm">Subscribe for unlimited access</p>
                <p className="text-xs text-[#64748b] mt-1">
                  $2/month or $12/year — coming soon!
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
