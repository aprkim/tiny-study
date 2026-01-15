import { useEffect, useState } from "react";
import { Entry, EntryType } from "../types";
import { getEntryById, updateEntry } from "../storage";

interface EditEntryProps {
  entryId: string;
  onBack: () => void;
  onSaved: () => void;
}

const entryTypes: EntryType[] = ["word", "idiom", "expression", "sentence"];

export default function EditEntry({ entryId, onBack, onSaved }: EditEntryProps) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<EntryType>("word");
  const [term, setTerm] = useState("");
  const [sourceSentence, setSourceSentence] = useState("");
  const [meaning, setMeaning] = useState("");
  const [nuance, setNuance] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [repeatFlag, setRepeatFlag] = useState(false);
  const [masteredFlag, setMasteredFlag] = useState(false);
  const [errors, setErrors] = useState<{ term?: string; sourceSentence?: string }>({});

  useEffect(() => {
    const loadEntry = async () => {
      setLoading(true);
      try {
        const e = await getEntryById(entryId);
        if (e) {
          setEntry(e);
          setType(e.type);
          setTerm(e.term);
          setSourceSentence(e.sourceSentence || "");
          setMeaning(e.meaning || "");
          setNuance(e.nuance || "");
          setTags(e.tags || []);
          setRepeatFlag(e.repeatFlag || false);
          setMasteredFlag(e.masteredFlag || false);
        }
      } catch (error) {
        console.error("Failed to load entry:", error);
      } finally {
        setLoading(false);
      }
    };
    loadEntry();
  }, [entryId]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-[#64748b] text-center py-16">Loading...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-[#64748b] text-center py-16">Entry not found.</p>
        <button
          onClick={onBack}
          className="w-full px-4 py-3 bg-[#f0f4f3] text-[#1e293b] rounded-lg font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

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

  const handleSave = async () => {
    if (!validate()) return;

    await updateEntry(entryId, {
      type,
      term: term.trim(),
      sourceSentence: sourceSentence.trim() || undefined,
      meaning: meaning.trim() || undefined,
      nuance: nuance.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      repeatFlag,
      masteredFlag,
    });

    onSaved();
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
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
        <h1 className="text-lg font-semibold text-[#1e293b]">Edit Entry</h1>
      </header>

      <div className="space-y-5">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-[#1e293b] mb-2">
            Type
          </label>
          <div className="flex gap-1 p-1 bg-[#f0f4f3] rounded-lg">
            {entryTypes.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                  type === t
                    ? "bg-white text-[#1e293b] shadow-sm"
                    : "text-[#64748b] hover:text-[#1e293b]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Term */}
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
            className={`w-full px-4 py-3 bg-white border rounded-lg text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#BF3143] ${
              errors.term ? "border-[#BF3143]" : "border-[#e2e8f0]"
            }`}
          />
          {errors.term && (
            <p className="mt-2 text-sm text-[#BF3143]">{errors.term}</p>
          )}
        </div>

        {/* Source Sentence */}
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
              rows={2}
              className={`w-full px-4 py-3 bg-white border rounded-lg text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#BF3143] resize-none ${
                errors.sourceSentence ? "border-[#BF3143]" : "border-[#e2e8f0]"
              }`}
            />
            {errors.sourceSentence && (
              <p className="mt-2 text-sm text-[#BF3143]">{errors.sourceSentence}</p>
            )}
          </div>
        )}

        {/* Meaning */}
        <div>
          <label className="block text-sm font-medium text-[#1e293b] mb-2">
            Meaning
          </label>
          <textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#BF3143] resize-none"
          />
        </div>

        {/* Nuance */}
        <div>
          <label className="block text-sm font-medium text-[#1e293b] mb-2">
            Nuance / Culture
          </label>
          <textarea
            value={nuance}
            onChange={(e) => setNuance(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#BF3143] resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-[#1e293b] mb-2">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag and press Enter"
              className="flex-1 px-4 py-2 bg-white border border-[#e2e8f0] rounded-lg text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143]"
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 bg-[#f0f4f3] text-[#1e293b] rounded-lg font-medium hover:bg-[#e2e8f0] transition-colors"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#F7F5FA] text-[#6E6282] text-sm rounded-lg"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-[#6E6282] hover:text-[#BF3143] transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Flags */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={repeatFlag}
              onChange={(e) => setRepeatFlag(e.target.checked)}
              className="w-5 h-5 rounded border-[#e2e8f0] text-[#BF3143] focus:ring-[#BF3143]"
            />
            <span className="text-sm text-[#1e293b]">In repeat list</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={masteredFlag}
              onChange={(e) => setMasteredFlag(e.target.checked)}
              className="w-5 h-5 rounded border-[#e2e8f0] text-[#BF3143] focus:ring-[#BF3143]"
            />
            <span className="text-sm text-[#1e293b]">Mastered</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 bg-[#f0f4f3] text-[#1e293b] rounded-lg font-medium hover:bg-[#e2e8f0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-[#BF3143] text-white rounded-lg font-medium hover:bg-[#a52a3a] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
